// Codemod: make Next.js 16 async route params work in all API route handlers.
// Next 15+ passes `params` (and `searchParams`) as a Promise to route handlers.
// Every handler using `{ params }` synchronously gets `params.id === undefined`.
// Fix: insert `params = await params` as the first statement of each handler.
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const root = '/home/z/my-project/src/app/api'
const files = execSync(`grep -rl '{ params }' ${root} --include='route.ts'`).toString().trim().split('\n')

let patchedHandlers = 0
for (const file of files) {
  let src = fs.readFileSync(file, 'utf8')
  const original = src

  // Match handler signatures ending with `{ params })` and insert the await
  // right after the opening brace, unless already patched.
  src = src.replace(
    /(export async function (?:GET|POST|PATCH|PUT|DELETE)\s*\([^)]*\{\s*params\s*\}\s*\)\s*\{)(?!\s*params = await params)/g,
    (match, head) => {
      patchedHandlers++
      return `${head}\n  params = await params`
    }
  )

  if (src !== original) {
    fs.writeFileSync(file, src)
    console.log(`patched ${path.relative('/home/z/my-project', file)}`)
  }
}
console.log(`\nDone: ${patchedHandlers} handler(s) patched across ${files.length} file(s)`)
