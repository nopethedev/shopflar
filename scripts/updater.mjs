#!/usr/bin/env node
// ============================================================
// Shopflar Auto-Updater
// ============================================================
// Applies a Shopflar update package (zip) to an existing install:
//
//   1. Extracts the zip (pure Node — no unzip binary or npm deps needed)
//   2. Preserves your local files: package.json (your custom scripts/ports!),
//      .env, lockfiles, database, public/uploads, node_modules, .next, logs
//   3. Removes files that were deleted in the new version (tracked manifest)
//   4. Optionally merges dependency updates into your package.json
//      (your scripts, name and customizations are NEVER touched)
//   5. Runs `npm install` (only when dependencies actually changed)
//   6. Runs `npm run db:push` (schema migration, data is kept)
//   7. Runs scripts/backfill-verify.mjs once (marks existing users verified)
//   8. Optionally rebuilds (`npm run build`) — needed for `next start`
//   9. Kills the old server process and starts your own `npm run start`
//  10. Waits until the server answers, then reports success
//
// Usage:
//   node scripts/updater.mjs <path/to/update.zip> [options]
//   node scripts/updater.mjs updates/pending.zip --rebuild
//   node scripts/updater.mjs --github --repo owner/repo --branch main --rebuild
//
// Options:
//   --github          Download the update package from GitHub (main branch)
//                     instead of using an uploaded zip. Repo/branch come from
//                     --repo/--branch (or GITHUB_REPO/GITHUB_BRANCH env).
//                     For private repos set the GITHUB_TOKEN env var.
//   --repo <o/r>      GitHub repository (default from GITHUB_REPO env)
//   --branch <name>   Branch to pull (default from GITHUB_BRANCH env, else main)
//   --rebuild         Run `npm run build` before restarting (needed when your
//                     start script runs a production server, i.e. `next start`)
//   --no-rebuild      Skip the build step
//   --merge-deps      Apply dependency version updates from the package into
//                     your package.json (scripts are always preserved) [default]
//   --no-merge-deps   Never touch package.json at all
//   --npm-install     Force `npm install` even if dependencies didn't change
//   --skip-backfill   Skip the one-time email-verification backfill
//   --no-restart      Apply files + db:push but don't kill/restart the server
//   --dry-run         Extract and validate only — change nothing
//
// Progress is written to updates/state.json (polled by the admin UI) and a
// full log to updates/updater-<timestamp>.log
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { spawn, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import http from 'node:http'

const IS_WIN = process.platform === 'win32'
const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const updatesDir = path.join(appDir, 'updates')

// ---------- CLI args ----------
const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const argVal = (name, envName, dflt = null) => {
  const i = args.indexOf(name)
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1]
  if (process.env[envName]) return process.env[envName]
  return dflt
}
const zipArg = args.find(a => !a.startsWith('--') && a !== argVal('--repo', '') && a !== argVal('--branch', ''))
const OPT = {
  zip: zipArg ? path.resolve(appDir, zipArg) : null,
  github: has('--github'),
  repo: argVal('--repo', 'GITHUB_REPO'),
  branch: argVal('--branch', 'GITHUB_BRANCH', 'main'),
  rebuild: has('--rebuild'),
  noRebuild: has('--no-rebuild'),
  mergeDeps: !has('--no-merge-deps'),
  npmInstall: has('--npm-install'),
  skipBackfill: has('--skip-backfill'),
  restart: !has('--no-restart') && !has('--dry-run'),
  dryRun: has('--dry-run')
}

// ---------- state + log ----------
const stateFile = path.join(updatesDir, 'state.json')
const logFile = path.join(updatesDir, `updater-${Date.now()}.log`)
fs.mkdirSync(updatesDir, { recursive: true })

const state = {
  status: 'running',
  step: 'init',
  message: 'Starting update…',
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  finishedAt: null,
  error: null,
  versions: { from: null, to: null },
  steps: [],
  log: [],
  logFile: path.relative(appDir, logFile),
  serverRestarted: false,
  health: null
}

function writeState() {
  state.updatedAt = new Date().toISOString()
  try { fs.writeFileSync(stateFile, JSON.stringify(state, null, 2)) } catch {}
}

function log(msg) {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${msg}`
  state.log.push(line)
  if (state.log.length > 600) state.log.splice(0, state.log.length - 600)
  console.log(line)
  try { fs.appendFileSync(logFile, line + '\n') } catch {}
  writeState()
}

function step(key, label, status = 'active', detail = '') {
  let s = state.steps.find(x => x.key === key)
  if (!s) { s = { key, label, status: 'active', detail: '' }; state.steps.push(s) }
  s.status = status
  if (detail) s.detail = detail
  state.step = key
  state.message = label
  writeState()
}

// ---------- pure-JS zip reader (store + deflate, no deps) ----------
function readZip(buf) {
  const EOCD = 0x06054b50
  let eocd = -1
  const minPos = Math.max(0, buf.length - 22 - 65536)
  for (let i = buf.length - 22; i >= minPos; i--) {
    if (buf.readUInt32LE(i) === EOCD) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('Not a valid zip archive (no end-of-central-directory record)')
  const entryCount = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const entries = []
  for (let n = 0; n < entryCount; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) {
      throw new Error('Corrupt zip central directory')
    }
    const method = buf.readUInt16LE(p + 10)
    const compSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const lfhOffset = buf.readUInt32LE(p + 42)
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8')
    p += 46 + nameLen + extraLen + commentLen
    if (name.endsWith('/')) continue // directory entry
    entries.push({ name, method, compSize, lfhOffset })
  }
  return entries.map(e => {
    if (e.lfhOffset + 30 > buf.length || buf.readUInt32LE(e.lfhOffset) !== 0x04034b50) {
      throw new Error(`Corrupt zip local header: ${e.name}`)
    }
    const lfhNameLen = buf.readUInt16LE(e.lfhOffset + 26)
    const lfhExtraLen = buf.readUInt16LE(e.lfhOffset + 28)
    const start = e.lfhOffset + 30 + lfhNameLen + lfhExtraLen
    const raw = buf.slice(start, start + e.compSize)
    let data
    if (e.method === 0) data = Buffer.from(raw)
    else if (e.method === 8) data = zlib.inflateRawSync(raw)
    else throw new Error(`Unsupported zip compression method ${e.method} (entry: ${e.name})`)
    return { name: e.name, data }
  })
}

// Strip the common top-level folder (e.g. "shopflar/") and reject zip-slip
function normalizeEntries(entries) {
  const prefixes = new Set(entries.map(e => e.name.split('/')[0]))
  const strip = prefixes.size === 1 && !prefixes.has('package.json')
  const out = []
  for (const e of entries) {
    let rel = strip ? e.name.split('/').slice(1).join('/') : e.name
    if (!rel) continue
    const parts = rel.split('/')
    if (parts.includes('..') || path.isAbsolute(rel) || /^[a-zA-Z]:/.test(parts[0])) {
      throw new Error(`Unsafe path in zip: ${e.name}`)
    }
    out.push({ rel, data: e.data })
  }
  return out
}

// ---------- preserved paths ----------
// These are never overwritten or deleted by an update:
function isPreserved(rel) {
  if (rel === '.env') return true                                       // your config
  if (rel.startsWith('.env.') && rel !== '.env.example') return true    // .env.local etc, but ship .env.example updates
  if (rel === 'package.json' || rel === 'package-lock.json') return true   // YOUR package.json (custom scripts/ports)
  if (rel === 'bun.lock' || rel === 'yarn.lock' || rel === 'pnpm-lock.yaml') return true
  if (rel === 'node_modules' || rel.startsWith('node_modules/')) return true
  if (rel === '.next' || rel.startsWith('.next/')) return true
  if (rel.startsWith('public/uploads/')) return true                       // uploaded media
  if (rel === 'db' || rel.startsWith('db/')) return true                   // SQLite database
  if (rel.startsWith('prisma/') && /\.db(-journal)?$|\.sqlite$/.test(rel)) return true
  if (rel === 'updates' || rel.startsWith('updates/')) return true
  if (rel === 'logs' || rel.startsWith('logs/')) return true
  if (rel === '.server-pid') return true
  return false
}

// ---------- database provider preservation ----------
// Users can switch the datasource to mysql/postgres with `npm run switch-db`.
// The shipped schema.prisma defaults to sqlite — without this, every update
// would silently revert the database provider and break the next db:push.
function readInstalledDatasource() {
  try {
    const schema = fs.readFileSync(path.join(appDir, 'prisma', 'schema.prisma'), 'utf8')
    const ds = schema.match(/datasource\s+db\s*\{[\s\S]*?\}/)?.[0] || ''
    return {
      provider: ds.match(/provider\s*=\s*"([^"]+)"/)?.[1] || null,
      urlEnv: ds.match(/url\s*=\s*env\(\s*"([^"]+)"\s*\)/)?.[1] || null
    }
  } catch { return null }
}

// Re-apply the user's provider/url-env onto a freshly copied schema.prisma
function restoreDatasource(destPath, datasource) {
  if (!datasource || (!datasource.provider && !datasource.urlEnv)) return false
  try {
    let schema = fs.readFileSync(destPath, 'utf8')
    const dsRe = /datasource\s+db\s*\{[\s\S]*?\}/
    const block = schema.match(dsRe)?.[0]
    if (!block) return false
    let patched = block
    if (datasource.provider) {
      patched = patched.replace(/(provider\s*=\s*)"[^"]+"/, `$1"${datasource.provider}"`)
    }
    if (datasource.urlEnv) {
      patched = patched.replace(/(url\s*=\s*env\(\s*)"[^"]+"(\s*\))/, `$1"${datasource.urlEnv}"$2`)
    }
    if (patched === block) return false
    schema = schema.replace(dsRe, patched)
    fs.writeFileSync(destPath, schema)
    return true
  } catch { return false }
}

// ---------- process helpers ----------
function runCmd(cmd, cmdArgs, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, cmdArgs, {
      cwd: appDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: IS_WIN
    })
    let out = ''
    child.stdout.on('data', d => { out += d.toString() })
    child.stderr.on('data', d => { out += d.toString() })
    child.on('error', (e) => resolve({ code: 1, out: out + '\n' + e.message }))
    child.on('close', (code) => resolve({ code: code ?? 1, out }))
    if (opts.timeoutMs) {
      setTimeout(() => { try { child.kill('SIGKILL') } catch {} }, opts.timeoutMs).unref()
    }
  })
}

function tail(s, n = 800) { return s.length > n ? s.slice(-n) : s }

function findServerPidFromFile() {
  try {
    const raw = fs.readFileSync(path.join(updatesDir, 'server.pid'), 'utf8').trim()
    try { return parseInt(JSON.parse(raw).pid, 10) } catch { return parseInt(raw, 10) }
  } catch { return null }
}

function pidAlive(pid) {
  try { process.kill(pid, 0); return true } catch { return false }
}

function pidCmdline(pid) {
  try {
    return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ')
  } catch { return '' }
}

// Linux: find PIDs with a socket listening on the given port
function findPidsOnPort(port) {
  if (IS_WIN || !port) return []
  const pids = new Set()
  try {
    const inodes = new Set()
    for (const f of ['/proc/net/tcp', '/proc/net/tcp6']) {
      const lines = fs.readFileSync(f, 'utf8').split('\n').slice(1)
      for (const line of lines) {
        const cols = line.trim().split(/\s+/)
        if (cols.length < 10) continue
        const local = cols[1]; const st = cols[3]; const inode = cols[9]
        if (st !== '0A') continue // LISTEN
        const portHex = parseInt(local.split(':')[1], 16)
        if (portHex === port) inodes.add(inode)
      }
    }
    if (!inodes.size) return []
    for (const pidDir of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(pidDir)) continue
      const fdDir = `/proc/${pidDir}/fd`
      let fds
      try { fds = fs.readdirSync(fdDir) } catch { continue }
      for (const fd of fds) {
        try {
          const link = fs.readlinkSync(`${fdDir}/${fd}`)
          const m = link.match(/^socket:\[(\d+)\]$/)
          if (m && inodes.has(m[1])) { pids.add(parseInt(pidDir, 10)); break }
        } catch {}
      }
    }
  } catch {}
  return [...pids]
}

function detectPort() {
  if (process.env.PORT && /^\d+$/.test(process.env.PORT)) return parseInt(process.env.PORT, 10)
  try {
    const envFile = fs.readFileSync(path.join(appDir, '.env'), 'utf8')
    const m = envFile.match(/^\s*PORT\s*=\s*(\d+)/m)
    if (m) return parseInt(m[1], 10)
  } catch {}
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'))
    const s = pkg.scripts?.start || ''
    const m = s.match(/-p\s*(?:\$\{PORT:-(\d+)\}|(\d+))/)
    if (m) return parseInt(m[1] || m[2], 10)
  } catch {}
  return 3000
}

async function killPid(pid, label) {
  if (!pid || pid === process.pid || !pidAlive(pid)) return false
  log(`Stopping old server: ${label || 'process'} (pid ${pid})`)
  try { process.kill(pid, 'SIGTERM') } catch { return false }
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 100))
    if (!pidAlive(pid)) { log(`Process ${pid} stopped.`); return true }
  }
  log(`Process ${pid} didn't stop gracefully — sending SIGKILL`)
  try { process.kill(pid, 'SIGKILL') } catch {}
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 100))
    if (!pidAlive(pid)) return true
  }
  log(`WARNING: process ${pid} could not be stopped`)
  return false
}

async function stopOldServer() {
  // 1) PID written by instrumentation on every server boot
  const pid = findServerPidFromFile()
  if (pid && pid !== process.pid) {
    const cmd = pidCmdline(pid)
    if (cmd && !/updater|node.*scripts\/updater/.test(cmd)) {
      await killPid(pid, cmd.slice(0, 80))
    }
  }
  // 2) Fallback: anything still listening on the app port
  const port = detectPort()
  for (const p of findPidsOnPort(port)) {
    if (p !== process.pid) await killPid(p, `listening on port ${port}`)
  }
  await new Promise(r => setTimeout(r, 500))
}

function startServer() {
  const out = fs.openSync(logFile, 'a')
  fs.appendFileSync(logFile, `\n========== server restarted by updater at ${new Date().toISOString()} ==========\n`)
  const cmd = IS_WIN ? 'cmd' : 'sh'
  const cmdArgs = IS_WIN ? ['/c', 'npm run start'] : ['-c', 'exec npm run start']
  const child = spawn(cmd, cmdArgs, {
    cwd: appDir,
    env: process.env,
    detached: true,
    stdio: ['ignore', out, out]
  })
  child.unref()
  log(`Server started via "npm run start" (your own package.json script, pid ${child.pid}).`)
  return child.pid
}

function waitForServer(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve) => {
    const attempt = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/', timeout: 2500 }, (res) => {
        res.resume()
        resolve({ ok: true, port })
      })
      req.on('timeout', () => { req.destroy(); retry() })
      req.on('error', () => retry())
      function retry() {
        if (Date.now() > deadline) return resolve({ ok: false, port })
        setTimeout(attempt, 1500)
      }
    }
    attempt()
  })
}

// ---------- GitHub source ----------
// Downloads the branch zipball via the GitHub API (works for public AND
// private repos — pass GITHUB_TOKEN for private). Returns the local zip path.
async function downloadFromGitHub() {
  const repo = (OPT.repo || '').replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '')
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new Error(`Invalid GitHub repository: "${OPT.repo || '(empty)'}" — expected owner/name (see Admin → Updates)`)
  }
  const branch = OPT.branch || 'main'
  const token = process.env.GITHUB_TOKEN || ''
  step('github', `Downloading update from GitHub (${repo}@${branch})`)
  log(`Fetching https://api.github.com/repos/${repo}/zipball/${branch}${token ? ' (with token)' : ''}`)

  const res = await fetch(`https://api.github.com/repos/${repo}/zipball/${encodeURIComponent(branch)}`, {
    headers: {
      'User-Agent': 'Shopflar-Updater',
      'Accept': 'application/vnd.github+json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(10 * 60 * 1000)
  })
  if (!res.ok) {
    const hint = res.status === 404
      ? ' — repository or branch not found (check owner/name and branch; for private repos a token is required)'
      : res.status === 401
        ? ' — token rejected by GitHub (check GITHUB_TOKEN)'
        : ''
    throw new Error(`GitHub download failed (HTTP ${res.status})${hint}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 1000 || buf.readUInt32LE(0) !== 0x04034b50) {
    throw new Error('GitHub returned something that is not a zip archive')
  }
  const dest = path.join(updatesDir, `github-${Date.now()}.zip`)
  fs.writeFileSync(dest, buf)
  log(`Downloaded ${(buf.length / (1024 * 1024)).toFixed(1)} MB → ${path.relative(appDir, dest)}`)
  step('github', `Downloading update from GitHub (${repo}@${branch})`, 'done', `${(buf.length / (1024 * 1024)).toFixed(1)} MB`)
  return dest
}

// ---------- main ----------
async function main() {
  writeState()
  log('Shopflar updater started')
  log(`App directory: ${appDir}`)
  if (OPT.dryRun) log('DRY RUN — nothing will be modified')

  // Give the HTTP response of the upload/run request time to flush
  // before we eventually kill this server process.
  await new Promise(r => setTimeout(r, OPT.dryRun ? 200 : 2000))

  let zipPath = OPT.zip
  if (OPT.github) {
    zipPath = await downloadFromGitHub()
  }

  if (!zipPath || !fs.existsSync(zipPath)) {
    throw new Error(`Update package not found: ${zipPath || '(none given — pass a zip path or --github)'}`)
  }
  const zipStat = fs.statSync(zipPath)
  if (zipStat.size < 1000) throw new Error('Update package is too small to be valid')
  const zipBuf = fs.readFileSync(zipPath)
  if (zipBuf.length < 4 || zipBuf.readUInt32LE(0) !== 0x04034b50) {
    throw new Error('File is not a zip archive')
  }

  // ---- extract ----
  step('extract', 'Reading update package')
  const entries = normalizeEntries(readZip(zipBuf))
  log(`Package contains ${entries.length} files`)
  if (!entries.some(e => e.rel === 'package.json')) {
    throw new Error('Invalid update package: package.json missing at archive root')
  }
  if (!entries.some(e => e.rel === 'prisma/schema.prisma')) {
    throw new Error('Invalid update package: prisma/schema.prisma missing — is this a Shopflar package?')
  }
  const pkgNew = JSON.parse(entries.find(e => e.rel === 'package.json').data.toString('utf8'))
  let pkgOld = null
  try { pkgOld = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8')) } catch {}
  state.versions = { from: pkgOld?.version || 'unknown', to: pkgNew.version || 'unknown' }
  log(`Version: ${state.versions.from} → ${state.versions.to}`)

  let extractDir = null
  if (!OPT.dryRun) {
    extractDir = path.join(updatesDir, `extract-${Date.now()}`)
    fs.mkdirSync(extractDir, { recursive: true })
    for (const e of entries) {
      const dest = path.join(extractDir, e.rel)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.writeFileSync(dest, e.data)
      if (e.rel.endsWith('.sh')) { try { fs.chmodSync(dest, 0o755) } catch {} }
    }
    log(`Extracted to ${path.relative(appDir, extractDir)}`)
  }
  step('extract', 'Reading update package', 'done', `${entries.length} files · v${state.versions.to}`)

  // ---- validate preserved package.json ----
  let depsChanged = false
  let mergeInfo = []
  if (pkgOld) {
    const sameDeps = JSON.stringify(pkgOld.dependencies || {}) === JSON.stringify(pkgNew.dependencies || {})
    const sameDev = JSON.stringify(pkgOld.devDependencies || {}) === JSON.stringify(pkgNew.devDependencies || {})
    depsChanged = !sameDeps || !sameDev
    if (depsChanged) {
      const all = { ...(pkgNew.dependencies || {}), ...(pkgNew.devDependencies || {}) }
      const before = { ...(pkgOld.dependencies || {}), ...(pkgOld.devDependencies || {}) }
      for (const [k, v] of Object.entries(all)) {
        if (before[k] !== v) mergeInfo.push(`${k}: ${before[k] || '(new)'} → ${v}`)
      }
      for (const k of Object.keys(before)) {
        if (!(k in all)) mergeInfo.push(`${k}: removed`)
      }
    }
    const scriptDiff = []
    const newScripts = pkgNew.scripts || {}
    const oldScripts = pkgOld.scripts || {}
    for (const k of Object.keys(newScripts)) {
      if (oldScripts[k] !== newScripts[k]) scriptDiff.push(`${k}`)
    }
    if (scriptDiff.length) {
      log(`Your package.json scripts are preserved (${scriptDiff.join(', ')} differ in this release — see the release notes if you want them)`)
    }
  }

  if (OPT.dryRun) {
    const preserved = entries.filter(e => isPreserved(e.rel)).map(e => e.rel)
    log(`DRY RUN OK — ${entries.length} files would be applied, ${preserved.length} would be skipped as preserved:`)
    for (const p of preserved.slice(0, 40)) log(`  preserved: ${p}`)
    step('finish', 'Dry run complete', 'done', 'no changes were made')
    state.status = 'done'
    state.finishedAt = new Date().toISOString()
    writeState()
    return
  }

  // ---- apply files ----
  step('apply', 'Applying update files')
  const manifestFile = path.join(updatesDir, 'manifest.json')
  let oldManifest = []
  try { oldManifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) } catch {}
  const oldSet = new Set(oldManifest)

  // Capture the user's current DB provider BEFORE overwriting the schema
  const userDatasource = readInstalledDatasource()

  const appliedRels = []
  let applied = 0, skipped = 0
  for (const e of entries) {
    if (isPreserved(e.rel)) { skipped++; continue }
    const dest = path.join(appDir, e.rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(path.join(extractDir, e.rel), dest)
    if (e.rel.endsWith('.sh')) { try { fs.chmodSync(dest, 0o755) } catch {} }
    // Keep the user's database provider (mysql/postgres) on the new schema
    if (e.rel === 'prisma/schema.prisma' && restoreDatasource(dest, userDatasource)) {
      log(`prisma/schema.prisma: kept YOUR database provider (${userDatasource.provider || 'same'}${userDatasource.urlEnv ? `, url env ${userDatasource.urlEnv}` : ''})`)
    }
    appliedRels.push(e.rel)
    applied++
  }
  log(`Applied ${applied} files (${skipped} skipped as preserved)`)

  // Delete files that existed in the previous version but are gone now
  let deleted = 0
  for (const rel of oldManifest) {
    if (isPreserved(rel)) continue
    if (!appliedRels.includes(rel)) {
      try { fs.unlinkSync(path.join(appDir, rel)); deleted++ } catch {}
    }
  }
  if (deleted) log(`Removed ${deleted} obsolete file(s) from the previous version`)
  fs.writeFileSync(manifestFile, JSON.stringify(appliedRels))
  step('apply', 'Applying update files', 'done', `${applied} applied · ${skipped} preserved · ${deleted} removed`)

  // ---- package.json: keep user's file, optionally refresh dependencies ----
  step('deps', 'Updating package.json')
  const userPkgPath = path.join(appDir, 'package.json')
  if (OPT.mergeDeps && depsChanged && pkgOld) {
    const merged = { ...pkgOld }
    merged.dependencies = pkgNew.dependencies || pkgOld.dependencies
    merged.devDependencies = pkgNew.devDependencies || pkgOld.devDependencies
    // user's scripts, name, version, private flag etc. stay exactly as they are
    fs.writeFileSync(userPkgPath, JSON.stringify(merged, null, 2) + '\n')
    log('package.json: your scripts/custom commands kept — dependency versions refreshed:')
    for (const l of mergeInfo.slice(0, 30)) log(`  ${l}`)
  } else {
    log('package.json: kept exactly as-is (your custom commands and ports are untouched)')
  }
  step('deps', 'Updating package.json', 'done', OPT.mergeDeps && depsChanged ? 'dependencies refreshed, scripts preserved' : 'unchanged')

  // ---- npm install (only when needed) ----
  const needInstall = OPT.npmInstall || (OPT.mergeDeps && depsChanged)
  if (needInstall) {
    step('install', 'Running npm install')
    log('Dependencies changed — running npm install…')
    const res = await runCmd('npm', ['install', '--no-audit', '--no-fund'], { timeoutMs: 10 * 60 * 1000 })
    if (res.code === 0) {
      log('npm install finished.')
      step('install', 'Running npm install', 'done')
    } else {
      log(`npm install exited with code ${res.code}:\n${tail(res.out)}`)
      step('install', 'Running npm install', 'warning', 'npm install had errors — check the log. The update continues.')
    }
  } else {
    log('Dependencies unchanged — skipping npm install')
  }

  // ---- db push ----
  step('db', 'Updating database schema (npm run db:push)')
  log('Running `npm run db:push` (uses YOUR package.json script; existing data is kept)…')
  const dbRes = await runCmd('npm', ['run', 'db:push'], { timeoutMs: 5 * 60 * 1000 })
  if (dbRes.code === 0) {
    log('Database schema is up to date.')
    step('db', 'Updating database schema', 'done')
  } else {
    log(`db:push exited with code ${dbRes.code}:\n${tail(dbRes.out)}`)
    throw new Error('db:push failed — server not restarted. Your old server is still running with the previous code. Check the updater log.')
  }

  // ---- one-time backfill (email verification introduction) ----
  if (!OPT.skipBackfill) {
    const marker = path.join(updatesDir, '.verified-backfilled')
    const backfillScript = path.join(appDir, 'scripts', 'backfill-verify.mjs')
    if (!fs.existsSync(marker) && fs.existsSync(backfillScript)) {
      step('backfill', 'Migrating existing users')
      log('First update with email verification — marking existing users as verified so nobody gets locked out…')
      const res = await runCmd(process.execPath, [backfillScript], { timeoutMs: 2 * 60 * 1000 })
      log(tail(res.out.trim() || 'backfill done', 400))
      step('backfill', 'Migrating existing users', res.code === 0 ? 'done' : 'warning')
    }
  }

  // ---- build ----
  let pkgNow = pkgOld
  try { pkgNow = JSON.parse(fs.readFileSync(userPkgPath, 'utf8')) } catch {}
  const hasBuild = !!pkgNow?.scripts?.build
  if (OPT.rebuild && hasBuild) {
    step('build', 'Rebuilding production bundle (npm run build)')
    log('Running `npm run build`… (this can take a few minutes)')
    const res = await runCmd('npm', ['run', 'build'], { timeoutMs: 15 * 60 * 1000 })
    if (res.code === 0) {
      log('Build finished.')
      step('build', 'Rebuilding production bundle', 'done')
    } else {
      log(`Build FAILED (exit ${res.code}):\n${tail(res.out)}`)
      step('build', 'Rebuilding production bundle', 'warning', 'build failed — the previous .next build will be used')
      log('Continuing with the previous build. The update is NOT fully applied — check the error above.')
    }
  } else if (!OPT.rebuild) {
    log('Skipping build (not requested). If your start script runs `next start`, enable "Rebuild" so new code takes effect.')
  }

  // ---- restart ----
  const port = detectPort()
  if (OPT.restart) {
    step('restart', 'Restarting server')
    await stopOldServer()
    startServer()
    state.serverRestarted = true
    step('restart', 'Restarting server', 'done', `pid file updated, port ${port}`)

    step('health', 'Waiting for the server to come back')
    const health = await waitForServer(port, 90000)
    state.health = health
    if (health.ok) {
      log(`Server is up and answering on port ${port} ✔`)
      step('health', 'Waiting for the server to come back', 'done', `port ${port}`)
    } else {
      log(`WARNING: server did not answer on port ${port} within 90s.`)
      log('It may still be booting — check the server log: ' + path.relative(appDir, logFile))
      step('health', 'Waiting for the server to come back', 'warning', `no response on port ${port}`)
    }
  } else {
    log('Restart skipped (--no-restart / --dry-run). Start the server manually with `npm run start`.')
    step('restart', 'Restarting server', 'done', 'skipped by option')
  }

  // ---- finish ----
  fs.rmSync(extractDir, { recursive: true, force: true })
  const lastUpdate = {
    at: new Date().toISOString(),
    from: state.versions.from,
    to: state.versions.to,
    filesApplied: applied,
    filesSkipped: skipped,
    filesDeleted: deleted,
    depsMerged: OPT.mergeDeps && depsChanged,
    npmInstalled: needInstall,
    rebuilt: !!(OPT.rebuild && hasBuild),
    serverRestarted: state.serverRestarted,
    health: state.health,
    logFile: state.logFile,
    durationMs: Date.now() - new Date(state.startedAt).getTime()
  }
  fs.writeFileSync(path.join(updatesDir, 'last-update.json'), JSON.stringify(lastUpdate, null, 2))
  step('finish', 'Update complete', 'done', `v${state.versions.from} → v${state.versions.to}`)
  log(`Update complete: v${state.versions.from} → v${state.versions.to}`)
  state.status = 'done'
  state.finishedAt = new Date().toISOString()
  writeState()
}

main().catch((e) => {
  state.status = 'error'
  state.error = e.message
  state.finishedAt = new Date().toISOString()
  log(`ERROR: ${e.message}`)
  console.error(e)
  writeState()
  process.exit(1)
})
