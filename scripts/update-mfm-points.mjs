import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parseMfmPage } from './mfm-parser.mjs'

const root = new URL('../', import.meta.url)
const baseUrl = 'https://mfm.warhammer-community.com'
const cacheDirectory = new URL('Data/11th/mfm-cache/', root)
const offline = process.argv.includes('--offline')

async function download(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(120_000) })
      if (!response.ok) throw new Error(`HTTP ${response.status} at ${url}`)
      return await response.text()
    } catch (error) {
      if (attempt === 3) throw error
      console.warn(`MFM download attempt ${attempt} failed for ${url}: ${error.message}; retrying.`)
    }
  }
  throw new Error(`Could not download ${url}`)
}

await mkdir(cacheDirectory, { recursive: true })
async function page(slug) {
  const cachePath = new URL(`${slug || 'index'}.html`, cacheDirectory)
  if (offline) return readFile(cachePath, 'utf8')
  const html = await download(`${baseUrl}/en${slug ? `/${slug}` : ''}`)
  await writeFile(cachePath, html)
  return html
}

const index = await page('')
const slugs = [...new Set([...index.matchAll(/href="\/en\/([a-z0-9-]+)"/g)]
  .map((match) => match[1]))].sort()
if (slugs.length < 20) throw new Error(`Only ${slugs.length} MFM faction links found; refusing incomplete update`)

const entries = []
const versions = {}
// Keep requests sequential to avoid imposing unnecessary load on the publisher.
for (const slug of slugs) {
  const parsed = parseMfmPage(await page(slug), slug, `${baseUrl}/en/${slug}`)
  entries.push(...parsed.entries)
  versions[slug] = parsed.version
  console.log(`${slug}: ${parsed.entries.length} records (${parsed.version})`)
}
const result = {
  schemaVersion: 1,
  sourceUrl: `${baseUrl}/en`,
  fetchedAt: offline
    ? JSON.parse(await readFile(new URL('Data/11th/mfm-points.json', root), 'utf8')).fetchedAt
    : new Date().toISOString(),
  versions,
  entries,
}
const output = new URL('Data/11th/mfm-points.json', root)
const temporary = fileURLToPath(output) + '.tmp'
await writeFile(temporary, JSON.stringify(result, null, 2) + '\n')
await rename(temporary, output)
console.log(`Saved ${entries.length} official records. Run npm run build:11e to refresh matched rules.`)
