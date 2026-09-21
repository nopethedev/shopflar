// Setup script — runs all the steps needed to get Shopflar running
// Works with both npm and bun. Just run: npm run setup
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const log = (msg) => console.log(`\n\x1b[36m▶ ${msg}\x1b[0m`)
const ok = (msg) => console.log(`\x1b[32m  ✓ ${msg}\x1b[0m`)
const warn = (msg) => console.log(`\x1b[33m  ! ${msg}\x1b[0m`)
const err = (msg) => console.log(`\x1b[31m  ✗ ${msg}\x1b[0m`)

const cwd = process.cwd()

function run(cmd, opts = {}) {
  try {
    execSync(cmd, { cwd, stdio: 'inherit', ...opts })
    return true
  } catch (e) {
    return false
  }
}

function detectPm() {
  // Bun is faster but optional
  try {
    execSync('bun --version', { stdio: 'ignore' })
    return 'bun'
  } catch {
    return 'npm'
  }
}

function ensureEnv() {
  const envPath = path.join(cwd, '.env')
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(path.join(cwd, '.env.example'))) {
      fs.copyFileSync(path.join(cwd, '.env.example'), envPath)
      ok('Created .env from .env.example')
    } else {
      // Write a minimal default
      fs.writeFileSync(envPath, `DATABASE_URL="file:./db/custom.db"\nNEXTAUTH_SECRET="${crypto.randomBytes(32).toString('hex')}"\nNEXTAUTH_URL="http://localhost:3000"\nAPP_URL="http://localhost:3000"\nNEXT_PUBLIC_APP_URL="http://localhost:3000"\n`)
      ok('Created default .env')
    }
  } else {
    ok('.env already exists')
    // Make sure NEXTAUTH_SECRET is set
    const content = fs.readFileSync(envPath, 'utf8')
    if (content.includes('NEXTAUTH_SECRET="dev-secret-change-me-in-production"') || content.match(/^NEXTAUTH_SECRET=""\s*$/m)) {
      const newSecret = crypto.randomBytes(32).toString('hex')
      const updated = content.replace(/NEXTAUTH_SECRET="[^"]*"/, `NEXTAUTH_SECRET="${newSecret}"`)
      fs.writeFileSync(envPath, updated)
      ok('Generated NEXTAUTH_SECRET')
    }
  }
}

function ensureDbDir() {
  const dbDir = path.join(cwd, 'db')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
}

async function main() {
  console.log('\n\x1b[1m==========================================\x1b[0m')
  console.log('\x1b[1m  Shopflar — First-time Setup\x1b[0m')
  console.log('\x1b[1m==========================================\x1b[0m')

  const pm = detectPm()

  // 1. Ensure .env exists
  log('Setting up environment file...')
  ensureEnv()
  ensureDbDir()

  // 2. Install dependencies
  log(`Installing dependencies with ${pm}...`)
  if (!run(`${pm} install`)) {
    err('Failed to install dependencies')
    process.exit(1)
  }

  // 3. Generate Prisma client
  log('Generating Prisma client...')
  if (!run(`${pm} run db:generate`)) {
    err('Failed to generate Prisma client')
    process.exit(1)
  }

  // 4. Push database schema
  log('Creating database tables...')
  if (!run(`${pm} run db:push`)) {
    err('Failed to push database schema')
    warn('If you\'re using MySQL/MariaDB/PostgreSQL, check your DATABASE_URL in .env')
    process.exit(1)
  }

  // 4. Done — the install wizard at /install handles the rest
  console.log('\n\x1b[1m==========================================\x1b[0m')
  console.log('\x1b[1m  ✅ Setup complete!\x1b[0m')
  console.log('\x1b[1m==========================================\x1b[0m')
  console.log('\nNext steps:')
  console.log('  • Start the dev server:')
  console.log(`      ${pm} run dev`)
  console.log('  • Open http://localhost:' + (process.env.PORT || 3000) + ' in your browser')
  console.log('  • First-time visit will redirect to /install — set up your admin account there')
  console.log('  • Admin panel: http://localhost:' + (process.env.PORT || 3000) + '/admin')
  console.log('')
  console.log('  Custom port:')
  console.log(`      PORT=8080 ${pm} run dev`)
  console.log('')
  console.log('  For production (auto-builds if needed):')
  console.log(`      ${pm} run build && ${pm} run start`)
  console.log('  Or: ./scripts/start-prod.sh')
  console.log('')
}

main().catch((e) => {
  console.error('\nSetup failed:', e.message)
  process.exit(1)
})
