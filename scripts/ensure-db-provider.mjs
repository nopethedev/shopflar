#!/usr/bin/env node
// Makes one image work with SQLite *and* PostgreSQL.
//
// Prisma bakes the database provider into the generated client, so when
// DATABASE_URL points at Postgres we switch prisma/schema.prisma and
// regenerate the client (offline, ~2s, only when the provider changed).
//
//   APP_DIR=/app DATABASE_URL=postgresql://… node scripts/ensure-db-provider.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const appDir = process.env.APP_DIR || process.cwd()
const url = process.env.DATABASE_URL || ''

let provider
if (/^postgres(ql)?:\/\//i.test(url)) provider = 'postgresql'
else if (/^file:/i.test(url) || url === '') provider = 'sqlite'
else {
  console.error(`Unsupported DATABASE_URL scheme. Use file:… (SQLite) or postgresql://… (PostgreSQL).`)
  process.exit(1)
}

const providerRe = /(datasource\s+db\s*\{[\s\S]*?provider\s*=\s*)"[^"]+"/
const schemaPath = path.join(appDir, 'prisma', 'schema.prisma')
const schema = fs.readFileSync(schemaPath, 'utf8')
const current = schema.match(providerRe)?.[0].match(/"([^"]+)"$/)?.[1]

const clientSchemaPath = path.join(appDir, 'node_modules', '.prisma', 'client', 'schema.prisma')
const generated = fs.existsSync(clientSchemaPath)
  ? fs.readFileSync(clientSchemaPath, 'utf8').match(providerRe)?.[0].match(/"([^"]+)"$/)?.[1]
  : undefined

if (current !== provider) {
  fs.writeFileSync(schemaPath, schema.replace(providerRe, `$1"${provider}"`))
  console.log(`Database provider: ${current} → ${provider}`)
}

if (generated !== provider) {
  console.log(`Generating Prisma client for ${provider}…`)
  const bin = path.join(appDir, 'node_modules', '.bin', 'prisma')
  const r = spawnSync(bin, ['generate'], { cwd: appDir, stdio: 'inherit', env: process.env })
  if (r.status !== 0) process.exit(r.status || 1)
} else {
  console.log(`Prisma client already generated for ${provider}`)
}
