// Database provider switcher — makes it easy to switch between SQLite, MySQL/MariaDB, and PostgreSQL
// Usage:
//   node scripts/switch-db.js sqlite        # default, bundled
//   node scripts/switch-db.js mysql         # for MySQL or MariaDB
//   node scripts/switch-db.js postgres      # for PostgreSQL/Supabase
//
// For mysql/postgres, you'll be prompted for connection details, OR you can
// pass them via environment variables or pre-fill them in .env before running.
//
// Examples:
//   DATABASE_URL="mysql://user:pass@localhost:3306/shopflar" node scripts/switch-db.js mysql
//   DATABASE_URL="postgresql://user:pass@localhost:5432/shopflar" node scripts/switch-db.js postgres

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const log = (msg) => console.log(`\x1b[36m▶ ${msg}\x1b[0m`)
const ok = (msg) => console.log(`\x1b[32m  ✓ ${msg}\x1b[0m`)
const err = (msg) => console.log(`\x1b[31m  ✗ ${msg}\x1b[0m`)

const SCHEMA_PATH = path.join(process.cwd(), 'prisma', 'schema.prisma')
const ENV_PATH = path.join(process.cwd(), '.env')

const PROVIDERS = {
  sqlite: {
    name: 'SQLite',
    dataSource: 'sqlite',
    defaultUrl: 'file:./db/custom.db',
    description: 'Bundled, no external setup needed (default for local dev)'
  },
  mysql: {
    name: 'MySQL / MariaDB',
    dataSource: 'mysql',
    defaultUrl: 'mysql://root:password@localhost:3306/shopflar',
    description: 'Connects to MySQL 5.7+ or MariaDB 10.4+'
  },
  postgres: {
    name: 'PostgreSQL / Supabase',
    dataSource: 'postgresql',
    defaultUrl: 'postgresql://postgres:password@localhost:5432/shopflar',
    description: 'Connects to PostgreSQL 12+ or Supabase'
  }
}

function rl() {
  return readline.createInterface({ input: process.stdin, output: process.stdout })
}

function ask(question) {
  return new Promise((resolve) => {
    const i = rl()
    i.question(question, (answer) => {
      i.close()
      resolve(answer.trim())
    })
  })
}

function updateSchema(provider) {
  if (!fs.existsSync(SCHEMA_PATH)) {
    err('prisma/schema.prisma not found')
    process.exit(1)
  }
  let schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
  // Replace the datasource provider line
  schema = schema.replace(
    /(datasource\s+db\s+{[\s\S]*?provider\s*=\s*)"[^"]+"/,
    `$1"${provider}"`
  )
  fs.writeFileSync(SCHEMA_PATH, schema)
  ok(`Updated prisma/schema.prisma — provider = "${provider}"`)
}

function updateEnv(provider, dbUrl) {
  if (!fs.existsSync(ENV_PATH)) {
    fs.writeFileSync(ENV_PATH, `DATABASE_URL="${dbUrl}"\n`)
    ok(`Created .env with DATABASE_URL for ${PROVIDERS[provider].name}`)
    return
  }
  let env = fs.readFileSync(ENV_PATH, 'utf8')
  // Replace existing DATABASE_URL line (or comment it out if it's a different provider)
  const lines = env.split('\n')
  let found = false
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^DATABASE_URL=/)) {
      lines[i] = `DATABASE_URL="${dbUrl}"`
      found = true
      break
    }
  }
  if (!found) {
    lines.push(`DATABASE_URL="${dbUrl}"`)
  }
  env = lines.join('\n')
  fs.writeFileSync(ENV_PATH, env)
  ok(`Updated .env — DATABASE_URL = "${dbUrl}"`)
}

async function main() {
  const arg = process.argv[2]
  console.log('\n\x1b[1m==========================================\x1b[0m')
  console.log('\x1b[1m  Shopflar — Database Switcher\x1b[0m')
  console.log('\x1b[1m==========================================\x1b[0m\n')

  if (!arg || !PROVIDERS[arg]) {
    console.log('Usage:')
    console.log('  node scripts/switch-db.js sqlite     # bundled (default)')
    console.log('  node scripts/switch-db.js mysql       # MySQL or MariaDB')
    console.log('  node scripts/switch-db.js postgres   # PostgreSQL or Supabase')
    console.log('')
    console.log('Available providers:')
    for (const [key, p] of Object.entries(PROVIDERS)) {
      console.log(`  ${key.padEnd(10)} ${p.name} — ${p.description}`)
    }
    console.log('')
    console.log('For mysql/postgres, set DATABASE_URL in .env first OR run:')
    console.log('  DATABASE_URL="mysql://user:pass@host:3306/dbname" \\')
    console.log('    node scripts/switch-db.js mysql')
    process.exit(1)
  }

  const provider = arg
  const config = PROVIDERS[provider]

  log(`Switching to ${config.name}...`)
  console.log(`  ${config.description}`)

  let dbUrl = process.env.DATABASE_URL

  if (provider === 'sqlite') {
    dbUrl = dbUrl || config.defaultUrl
  } else {
    // For mysql/postgres, prompt if DATABASE_URL is not set or is still the sqlite default
    if (!dbUrl || dbUrl.startsWith('file:')) {
      console.log('')
      console.log(`\x1b[33m  ! DATABASE_URL not set or pointing to SQLite\x1b[0m`)
      console.log(`  You need a ${config.name} connection string.`)
      console.log('')
      console.log('  Format:')
      if (provider === 'mysql') {
        console.log('    mysql://USER:PASSWORD@HOST:PORT/DATABASE')
        console.log('    Example: mysql://root:password@localhost:3306/shopflar')
      } else {
        console.log('    postgresql://USER:PASSWORD@HOST:PORT/DATABASE')
        console.log('    Example: postgresql://postgres:password@localhost:5432/shopflar')
      }
      console.log('')
      dbUrl = await ask(`Enter your ${config.name} connection string: `)
      if (!dbUrl) {
        err('No connection string provided')
        process.exit(1)
      }
    }
  }

  // Update schema.prisma
  updateSchema(config.dataSource)

  // Update .env
  updateEnv(provider, dbUrl)

  console.log('')
  log('Next steps:')
  console.log('  1. Make sure your database server is running and accessible')
  console.log('  2. Create the database if it doesn\'t exist:')
  if (provider === 'mysql') {
    console.log('       mysql -u root -p -e "CREATE DATABASE shopflar;"')
    console.log('       # Or for MariaDB: mariadb -u root -p -e "CREATE DATABASE shopflar;"')
  } else if (provider === 'postgres') {
    console.log('       createdb shopflar')
    console.log('       # Or on Supabase, the database is created automatically')
  }
  console.log('  3. Push the schema to your new database:')
  console.log('       npm run db:generate')
  console.log('       npm run db:push')
  console.log('  4. Restart your dev server:')
  console.log('       npm run dev')
  console.log('')

  // Offer to push the schema now
  const answer = await ask('Push schema to the new database now? (y/N): ')
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    const { execSync } = require('child_process')
    try {
      console.log('')
      log('Running prisma generate...')
      execSync('npx prisma generate', { stdio: 'inherit' })
      log('Running prisma db push...')
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' })
      ok('Database schema pushed successfully!')
      console.log('')
      console.log('\x1b[32m✓ All done! Run \x1b[1mnpm run dev\x1b[0m\x1b[32m to start.\x1b[0m')
    } catch (e) {
      err('Failed to push schema. Check your DATABASE_URL and try running:')
      console.log('  npm run db:generate && npm run db:push')
      process.exit(1)
    }
  }
}

main().catch((e) => {
  err(e.message)
  process.exit(1)
})
