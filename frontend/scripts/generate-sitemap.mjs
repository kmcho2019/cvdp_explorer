import fs from 'node:fs'
import path from 'node:path'

const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY
const DEFAULT_BASE_URL = 'https://kmcho2019.github.io/cvdp_explorer'

function buildDefaultBaseUrl() {
  if (!GITHUB_REPOSITORY || !GITHUB_REPOSITORY.includes('/')) {
    return DEFAULT_BASE_URL
  }

  const [owner, repo] = GITHUB_REPOSITORY.split('/', 2)
  const ownerFallback = owner || 'kmcho2019'
  const repoFallback = repo || 'cvdp_explorer'

  if (repoFallback === `${ownerFallback}.github.io`) {
    return `https://${ownerFallback}.github.io`
  }

  return `https://${ownerFallback}.github.io/${repoFallback}`
}

const BASE_URL = process.env.SITEMAP_BASE_URL ?? buildDefaultBaseUrl()
const DATA_PATH = process.env.SITEMAP_INDEX_PATH ?? path.resolve(process.cwd(), 'public/data/index.json')
const OUTPUT_PATH = process.env.SITEMAP_OUTPUT_PATH ?? path.resolve(process.cwd(), 'public/sitemap.xml')
const RECORD_LIMIT_RAW = process.env.SITEMAP_RECORD_LIMIT
const RECORD_LIMIT = RECORD_LIMIT_RAW ? Number.parseInt(RECORD_LIMIT_RAW, 10) : Number.NaN

function normalizeBaseUrl(value) {
  if (!value) {
    return 'https://kmcho2019.github.io/cvdp_explorer/'
  }
  const trimmed = value.trim().replace(/\/$/, '')
  return `${trimmed}/`
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function buildSitemapUrls(baseUrl, records) {
  const urls = [
    {
      loc: baseUrl,
      changefreq: 'weekly',
      priority: '1.0',
    },
  ]

  const safeLimit = Number.isNaN(RECORD_LIMIT) ? undefined : Math.max(0, RECORD_LIMIT)
  const selectedRecords = typeof safeLimit === 'number' && safeLimit > 0 ? records.slice(0, safeLimit) : records

  for (const record of selectedRecords) {
    if (typeof record.id !== 'string' || record.id.trim() === '') {
      continue
    }

    const url = new URL(baseUrl)
    url.searchParams.set('id', record.id)
    urls.push({
      loc: url.toString(),
      changefreq: 'monthly',
      priority: '0.6',
    })
  }

  return urls
}

function buildSitemapXml(urls) {
  const rows = urls
    .map(
      (entry) => `
  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows}
</urlset>
`
}

function readRecords() {
  if (!fs.existsSync(DATA_PATH)) {
    return []
  }
  try {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.warn(`Unable to parse ${DATA_PATH}: ${(error instanceof Error ? error.message : 'Unknown parsing error')}`)
    return []
  }
}

const baseUrl = normalizeBaseUrl(BASE_URL)
const records = readRecords()
const urls = buildSitemapUrls(baseUrl, records)
const xml = buildSitemapXml(urls)

fs.writeFileSync(OUTPUT_PATH, xml, 'utf8')
console.log(`Generated sitemap: ${OUTPUT_PATH} (${urls.length} urls)`)
