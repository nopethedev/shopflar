'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { toast } from '@/lib/toast'
import {
  UploadCloud, RefreshCw, CheckCircle2, XCircle, Loader2, Clock,
  Terminal, ShieldCheck, PackageOpen, AlertTriangle, FileArchive,
  Github, GitBranch, CloudDownload
} from 'lucide-react'

const fmtBytes = (n) => {
  if (!n && n !== 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function StepRow({ step }) {
  const Icon = step.status === 'done' ? CheckCircle2
    : step.status === 'error' ? XCircle
    : step.status === 'warning' ? AlertTriangle
    : Loader2
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${step.status === 'active' ? 'animate-spin text-foreground' : step.status === 'done' ? 'text-emerald-600' : step.status === 'warning' ? 'text-amber-500' : 'text-destructive'}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{step.label}</p>
        {step.detail && <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>}
      </div>
    </div>
  )
}

export function AdminUpdaterManager({ version, lastUpdate, initialState, initialPending }) {
  const router = useRouter()
  const [pending, setPending] = useState(initialPending)
  const [uploading, setUploading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [monitoring, setMonitoring] = useState(initialState?.status === 'running')
  const [state, setState] = useState(initialState)
  const [serverDown, setServerDown] = useState(false)
  const [opts, setOpts] = useState({ rebuild: true, mergeDeps: true, npmInstall: false })
  const [source, setSource] = useState('github') // 'github' | 'zip'
  const [ghRepo, setGhRepo] = useState('')
  const [ghBranch, setGhBranch] = useState('main')
  const [ghToken, setGhToken] = useState('')
  const [hasToken, setHasToken] = useState(false)
  const [ghCommit, setGhCommit] = useState(null)
  const [ghError, setGhError] = useState(null)
  const [ghLoading, setGhLoading] = useState(true)
  const [ghSaving, setGhSaving] = useState(false)
  const pollRef = useRef(null)
  const monitorStart = useRef(null)
  const logEndRef = useRef(null)

  // ---------- polling ----------
  const poll = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/updater/status', { cache: 'no-store' })
      if (!r.ok) throw new Error('status failed')
      const d = await r.json()
      setServerDown(false)
      if (d.state) setState(d.state)
      if (d.state?.status !== 'running') {
        setMonitoring(false)
        if (d.state?.status === 'done' && monitorStart.current) {
          toast.success('Update complete', d.state.versions ? `v${d.state.versions.from} → v${d.state.versions.to}` : undefined)
          monitorStart.current = null
          router.refresh()
        } else if (d.state?.status === 'error' && monitorStart.current) {
          toast.error('Update failed', d.state.error)
          monitorStart.current = null
        }
      }
    } catch {
      // Fetch failed — the server is probably restarting right now
      setServerDown(true)
    }
  }, [router])

  useEffect(() => {
    if (!monitoring) return
    monitorStart.current = monitorStart.current || Date.now()
    poll()
    pollRef.current = setInterval(poll, 2000)
    return () => clearInterval(pollRef.current)
  }, [monitoring, poll])

  // Give up the "server restarting" message after 8 minutes
  useEffect(() => {
    if (serverDown && monitorStart.current && Date.now() - monitorStart.current > 8 * 60 * 1000) {
      setMonitoring(false)
      setServerDown(false)
      monitorStart.current = null
      toast.error('Lost track of the update', 'The server did not come back within 8 minutes. Check updates/state.json on the server.')
    }
  }, [serverDown])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'end' })
  }, [state?.log?.length])

  // ---------- GitHub settings ----------
  const loadGh = useCallback(async (withToast = false) => {
    setGhLoading(true)
    try {
      const r = await fetch('/api/admin/updater/github', { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      setGhRepo(d.repo || '')
      setGhBranch(d.branch || 'main')
      setHasToken(!!d.hasToken)
      setGhCommit(d.commit)
      setGhError(d.error)
      if (withToast && d.commit) toast.success('Latest commit loaded', `${d.commit.sha} — ${d.commit.message || ''}`)
      if (withToast && d.error) toast.error('GitHub check failed', d.error)
    } catch (e) {
      setGhError(e.message)
      if (withToast) toast.error('GitHub check failed', e.message)
    } finally {
      setGhLoading(false)
    }
  }, [])

  useEffect(() => { loadGh() }, [loadGh])

  const saveGh = async () => {
    setGhSaving(true)
    try {
      const body = { repo: ghRepo, branch: ghBranch }
      // Only send the token when the user typed a new one
      if (ghToken) body.token = ghToken
      const r = await fetch('/api/admin/updater/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Save failed')
      if (ghToken) setHasToken(true)
      setGhToken('')
      toast.success('GitHub settings saved')
      loadGh()
    } catch (e) {
      toast.error('Save failed', e.message)
    } finally {
      setGhSaving(false)
    }
  }

  // ---------- zip upload ----------
  const upload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/admin/updater', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Upload failed')
      setPending({ originalName: file.name, size: file.size })
      toast.success('Package uploaded', file.name)
    } catch (e) {
      toast.error('Upload failed', e.message)
    } finally {
      setUploading(false)
    }
  }

  const removePending = async () => {
    await fetch('/api/admin/updater/status', { method: 'DELETE' })
    setPending(null)
  }

  const start = async () => {
    if (source === 'github' && !ghRepo) {
      toast.error('No repository set', 'Enter your GitHub repository (owner/name) first.')
      return
    }
    if (source === 'zip' && !pending) return
    const notes = [
      'The update will now:',
      source === 'github'
        ? `• Download the latest code from GitHub (${ghRepo || 'repo'}@${ghBranch})`
        : '• Use the uploaded zip package',
      '• Replace app files (your .env, database, uploads and package.json scripts are kept)',
      opts.mergeDeps ? '• Refresh dependency versions if the release changed them' : '• Leave package.json 100% untouched',
      opts.rebuild ? '• Run npm run build' : null,
      '• Run npm run db:push',
      '• Restart the server with YOUR npm run start command',
      '',
      'The store will be offline for a minute during the restart. Start the update?'
    ].filter(Boolean).join('\n')
    if (!confirm(notes)) return
    setStarting(true)
    try {
      const r = await fetch('/api/admin/updater/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...opts,
          source,
          repo: ghRepo || undefined,
          branch: ghBranch || undefined
        })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not start')
      setState({ status: 'running', steps: [], log: [], message: 'Starting…' })
      setMonitoring(true)
    } catch (e) {
      toast.error('Failed to start', e.message)
    } finally {
      setStarting(false)
    }
  }

  const running = monitoring && state?.status === 'running'
  const canStart = source === 'github' ? !!ghRepo : !!pending

  return (
    <div className="space-y-4">
      {/* Current version + last update */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Installed version</p>
          <p className="text-2xl font-bold mt-1">v{version}</p>
          {lastUpdate && <p className="text-xs text-muted-foreground mt-1">Updated {new Date(lastUpdate.at).toLocaleString()}</p>}
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Last update</p>
          {lastUpdate ? (
            <>
              <p className="text-sm font-semibold mt-1">v{lastUpdate.from} → v{lastUpdate.to}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {lastUpdate.filesApplied} files · {Math.round((lastUpdate.durationMs || 0) / 1000)}s
                {lastUpdate.serverRestarted ? ' · server restarted' : ''}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">No updates applied yet</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Server process</p>
          <p className="text-sm font-semibold mt-1 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Running
          </p>
          <p className="text-xs text-muted-foreground mt-1">PID written on boot to updates/server.pid</p>
        </Card>
      </div>

      {/* Monitor (shown while an update runs / just finished) */}
      {(monitoring || state?.status === 'done' || state?.status === 'error') && (
        <Card className={`p-5 border-2 ${state?.status === 'error' ? 'border-destructive/40' : state?.status === 'done' ? 'border-emerald-500/40' : 'border-foreground/20'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              {state?.status === 'running' && <><Loader2 className="h-4 w-4 animate-spin" /> Update in progress…</>}
              {state?.status === 'done' && <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Update complete</>}
              {state?.status === 'error' && <><XCircle className="h-4 w-4 text-destructive" /> Update failed</>}
            </h3>
            {state?.versions && state.versions.from && (
              <Badge variant="outline">v{state.versions.from} → v{state.versions.to}</Badge>
            )}
          </div>

          {serverDown && (
            <div className="mb-4 rounded-md bg-muted p-4 text-sm flex items-center gap-3">
              <Clock className="h-5 w-5 shrink-0 animate-pulse" />
              <div>
                <p className="font-medium">Server is restarting…</p>
                <p className="text-muted-foreground">The connection dropped because the updater is rebooting the store. This page reconnects automatically — usually within 1–2 minutes.</p>
              </div>
            </div>
          )}

          {state?.steps?.length > 0 && (
            <div className="mb-4">
              {state.steps.map(s => <StepRow key={s.key} step={s} />)}
            </div>
          )}

          {state?.error && (
            <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          {state?.log?.length > 0 && (
            <details open={monitoring}>
              <summary className="text-xs uppercase tracking-wider text-muted-foreground cursor-pointer flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5" /> Updater log
              </summary>
              <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed whitespace-pre-wrap">
                {state.log.join('\n')}
                <div ref={logEndRef} />
              </pre>
            </details>
          )}

          {state?.status === 'done' && (
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reload panel
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setState(null)}>Dismiss</Button>
            </div>
          )}
        </Card>
      )}

      {/* Source picker */}
      <div className="flex gap-2">
        <button
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md border text-sm font-medium transition-colors ${source === 'github' ? 'border-foreground bg-foreground text-background' : 'border-border bg-background hover:bg-muted'}`}
          onClick={() => setSource('github')}
        >
          <Github className="h-4 w-4" /> Pull from GitHub
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md border text-sm font-medium transition-colors ${source === 'zip' ? 'border-foreground bg-foreground text-background' : 'border-border bg-background hover:bg-muted'}`}
          onClick={() => setSource('zip')}
        >
          <FileArchive className="h-4 w-4" /> Upload zip
        </button>
      </div>

      {/* Source panel + options */}
      <div className="grid lg:grid-cols-2 gap-4">
        {source === 'github' ? (
          <Card className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-1"><Github className="h-4 w-4" /> Update from GitHub</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Downloads the latest code from your repository&apos;s branch — no manual zip uploads needed.
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Repository (owner/name)</label>
                  <Input value={ghRepo} onChange={(e) => setGhRepo(e.target.value)} placeholder="nopethedev/shopflar" className="mt-1.5 font-mono text-xs" />
                </div>
                <div className="w-28">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Branch</label>
                  <Input value={ghBranch} onChange={(e) => setGhBranch(e.target.value)} placeholder="main" className="mt-1.5 font-mono text-xs" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Access token {hasToken ? <span className="text-emerald-600 normal-case">(saved ✓)</span> : <span className="normal-case">(optional — needed for private repos)</span>}
                </label>
                <Input
                  value={ghToken}
                  onChange={(e) => setGhToken(e.target.value)}
                  type="password"
                  placeholder={hasToken ? '•••••••••••• (leave empty to keep)' : 'github_pat_…'}
                  className="mt-1.5 font-mono text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={saveGh} disabled={ghSaving || (!ghRepo && !ghToken)}>
                  {ghSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                  Save settings
                </Button>
                <Button variant="outline" size="sm" onClick={() => loadGh(true)} disabled={ghLoading || !ghRepo}>
                  {ghLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                  Check for updates
                </Button>
              </div>

              {/* Latest commit */}
              {ghLoading && !ghCommit && (
                <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Checking GitHub…</p>
              )}
              {ghCommit && (
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <GitBranch className="h-3 w-3" /> Latest commit on {ghBranch}
                  </p>
                  <p className="text-sm font-medium">{ghCommit.message || '(no message)'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <code className="bg-muted px-1 rounded">{ghCommit.sha}</code> · {ghCommit.author} · {new Date(ghCommit.date).toLocaleString()}
                    {ghCommit.url && <a href={ghCommit.url} target="_blank" rel="noreferrer" className="ml-2 underline hover:text-foreground inline-flex items-center gap-0.5">open<CloudDownload className="h-3 w-3" /></a>}
                  </p>
                </div>
              )}
              {ghError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">{ghError}</div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-1"><PackageOpen className="h-4 w-4" /> Upload update package</h3>
            <p className="text-xs text-muted-foreground mb-4">
              The <code className="bg-muted px-1 rounded">shopflar.zip</code> from your latest Shopflar release.
            </p>

            {pending ? (
              <div className="flex items-center justify-between rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileArchive className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{pending.originalName || 'pending.zip'}</p>
                    <p className="text-xs text-muted-foreground">{fmtBytes(pending.size)} · ready to install</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={removePending}>Remove</Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-8 cursor-pointer hover:border-foreground/40 hover:bg-muted/40 transition-colors">
                {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <UploadCloud className="h-7 w-7 text-muted-foreground" />}
                <span className="text-sm font-medium">{uploading ? 'Uploading…' : 'Click to choose a .zip package'}</span>
                <span className="text-xs text-muted-foreground">max 500 MB</span>
                <input type="file" accept=".zip" className="hidden" disabled={uploading || running}
                  onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
              </label>
            )}
          </Card>
        )}

        <Card className="p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-1"><ShieldCheck className="h-4 w-4" /> Options &amp; start</h3>
          <p className="text-xs text-muted-foreground mb-4">What the updater should do after applying the files.</p>
          <div className="space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox checked={opts.rebuild} onCheckedChange={(v) => setOpts(o => ({ ...o, rebuild: !!v }))} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">Rebuild before restart <span className="text-muted-foreground font-normal">(npm run build)</span></p>
                <p className="text-xs text-muted-foreground">Required if your start script runs a production server (<code className="bg-muted px-1 rounded">next start</code>). Takes a few minutes.</p>
              </div>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox checked={opts.mergeDeps} onCheckedChange={(v) => setOpts(o => ({ ...o, mergeDeps: !!v }))} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">Apply dependency updates</p>
                <p className="text-xs text-muted-foreground">If the release changed dependencies, update them in <em>your</em> package.json — your scripts and custom commands are always kept.</p>
              </div>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox checked={opts.npmInstall} onCheckedChange={(v) => setOpts(o => ({ ...o, npmInstall: !!v }))} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">Force npm install</p>
                <p className="text-xs text-muted-foreground">Normally npm install only runs when dependencies actually changed.</p>
              </div>
            </label>
          </div>
          <Button className="w-full mt-5" size="lg" disabled={!canStart || running || starting || monitoring}
            onClick={start}>
            {running || monitoring ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Update running…</> : starting ? 'Starting…' : source === 'github' ? 'Update from GitHub now' : 'Start update'}
          </Button>
          {!canStart && <p className="text-xs text-muted-foreground text-center mt-2">{source === 'github' ? 'Set your GitHub repository first' : 'Upload a package first'}</p>}
        </Card>
      </div>

      {/* What gets preserved + CLI */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Always preserved during updates</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li><code className="bg-muted px-1 rounded text-foreground">package.json</code> — your custom scripts &amp; ports (dependencies can be refreshed optionally)</li>
            <li><code className="bg-muted px-1 rounded text-foreground">.env</code> — all your secrets and configuration</li>
            <li><code className="bg-muted px-1 rounded text-foreground">db/</code> &amp; <code className="bg-muted px-1 rounded text-foreground">prisma/*.db</code> — your database (schema updates via db:push)</li>
            <li><code className="bg-muted px-1 rounded text-foreground">DB provider</code> — if you switched to MySQL/Postgres via <code className="bg-muted px-1 rounded">npm run switch-db</code>, the schema keeps your provider after every update</li>
            <li><code className="bg-muted px-1 rounded text-foreground">public/uploads/</code> — uploaded product images &amp; files</li>
            <li><code className="bg-muted px-1 rounded text-foreground">node_modules/</code>, <code className="bg-muted px-1 rounded text-foreground">.next/</code>, lockfiles, <code className="bg-muted px-1 rounded text-foreground">logs/</code></li>
          </ul>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Terminal className="h-4 w-4" /> Or update from the terminal</h3>
          <pre className="rounded-md bg-muted p-3 text-xs leading-relaxed overflow-x-auto">{`# from a zip file:
node scripts/updater.mjs /path/to/shopflar.zip --rebuild

# straight from GitHub (private repos: set GITHUB_TOKEN):
GITHUB_TOKEN=github_pat_… node scripts/updater.mjs \\
  --github --repo owner/shopflar --branch main --rebuild

# useful flags:
#   --no-merge-deps   never touch package.json at all
#   --no-restart      apply files + db:push only
#   --dry-run         validate without changing anything`}</pre>
          <p className="text-xs text-muted-foreground mt-3">
            Full history and logs live in <code className="bg-muted px-1 rounded">updates/</code>.
          </p>
        </Card>
      </div>
    </div>
  )
}
