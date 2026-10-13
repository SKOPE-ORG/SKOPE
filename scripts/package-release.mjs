import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, mkdir, copyFile, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Explicit allowlist excludes development assets, future desktop icons and user files.
const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'))
const githubBeta = process.argv.includes('--github-beta')
assert(process.argv.slice(2).every((argument) => argument === '--github-beta'))
if (githubBeta) {
  assert.equal(manifest.version, '0.1.0')
  assert.equal(manifest.version_name, '0.1.0 Beta')
}
assert.equal(manifest.manifest_version, 3)
assert.deepEqual([...manifest.permissions].sort(), ['sidePanel', 'storage', 'tabGroups', 'tabs'].sort())
assert.equal(manifest.host_permissions, undefined)
assert.equal(manifest.content_scripts, undefined)
const html = await readFile('dist/index.html', 'utf8')
const files = new Set(['manifest.json', manifest.side_panel.default_path,
  manifest.background.service_worker, 'icons/skope-logo.png',
  ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)])
for (const match of html.matchAll(/(?:src|href)="\/?([^"?#]+)"/g)) files.add(match[1])
const staging = await mkdtemp(join(tmpdir(), 'skope-release-'))
for (const file of files) {
  assert(!file.includes('..') && !file.includes(':') && !file.startsWith('/'))
  const data = await readFile(join('dist', file))
  if (/\.(js|css|html|json)$/.test(file)) {
    const content = data.toString('utf8')
    // Fail without echoing a possible secret. Heuristics supplement the file allowlist.
    const suspicious = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{32,}|\/Users\/|Bearer\s+[A-Za-z0-9._-]{20,}/
    assert(!suspicious.test(content), `Potential sensitive material in ${file}; inspect locally`)
    assert(!/sourceMappingURL=/.test(content), `Unexpected source map in ${file}`)
  }
  if (file.endsWith('.png') && file !== 'icons/skope-logo.png') {
    const size = Number(file.match(/icon-(\d+)\.png$/)?.[1])
    assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.equal(data.readUInt32BE(16), size)
    assert.equal(data.readUInt32BE(20), size)
  }
  await mkdir(join(staging, file, '..'), { recursive: true })
  await copyFile(join('dist', file), join(staging, file))
}
await mkdir('release-artifacts', { recursive: true })
const artifact = githubBeta ? 'SKOPE-Extension-v0.1.0-beta.zip' : `skope-${manifest.version}-rc-${Date.now()}.zip`
const target = join(process.cwd(), 'release-artifacts', artifact)
// Build a fresh archive so an older ZIP cannot retain stale entries.
const temporaryZip = join(staging, 'package.zip')
execFileSync('zip', ['-X', '-q', temporaryZip, ...[...files].sort()], { cwd: staging })
await copyFile(temporaryZip, target)
const entries = execFileSync('unzip', ['-Z1', target], { encoding: 'utf8' }).trim().split('\n')
assert.deepEqual(entries.sort(), [...files].sort())
assert.equal(JSON.parse(execFileSync('unzip', ['-p', target, 'manifest.json'], { encoding: 'utf8' })).version, manifest.version)
const digest = createHash('sha256').update(await readFile(target)).digest('hex')
await writeFile(`${target}.sha256`, `${digest}  ${artifact}\n`)
await writeFile(`${target}.metadata.json`, JSON.stringify({
  candidateOnly: true, targetVersion: githubBeta ? '0.1.0-beta' : manifest.version,
  manifestVersion: manifest.version, sha256: digest,
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  files: entries, chromeManualQA: 'pending',
}, null, 2) + '\n')
await rm(staging, { recursive: true })
console.log(`RC only; version is not promoted: ${manifest.version}\n${target}\nSHA-256 ${digest}\n${files.size} verified files; manifest at ZIP root`)
