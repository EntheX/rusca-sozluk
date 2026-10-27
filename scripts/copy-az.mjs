// Az.js'i ve OpenCorpora sözlük dosyalarını public/az altına kopyalar (offline önbelleğe girsinler diye).
import { cpSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const root = path.dirname(require.resolve('az/package.json'))
const out = path.resolve('public/az')
mkdirSync(out, { recursive: true })
cpSync(path.join(root, 'dist/az.min.js'), path.join(out, 'az.min.js'))
cpSync(path.join(root, 'dicts'), path.join(out, 'dicts'), { recursive: true })
console.log('Az.js ve sözlükler kopyalandı →', out)
