// Publish draft GitHub release for Purtikus
// Usage: node scripts/publish-release.js
const https = require('https')
const pkg = require('../package.json')

const TOKEN = process.env.GH_TOKEN
if (!TOKEN) { console.error('Set GH_TOKEN env var'); process.exit(1) }

const opts = {
  hostname: 'api.github.com',
  path: '/repos/techvibedz/purtikus/releases',
  headers: { Authorization: `token ${TOKEN}`, 'User-Agent': 'purtikus-publish', Accept: 'application/vnd.github.v3+json' },
}

https.get(opts, (res) => {
  let body = ''
  res.on('data', (d) => body += d)
  res.on('end', () => {
    const releases = JSON.parse(body)
    const draft = releases.find(r => r.draft && r.tag_name === `v${pkg.version}`)
    if (!draft) { console.log(`No draft release found for v${pkg.version}`); return }

    const patchOpts = { ...opts, path: `/repos/techvibedz/purtikus/releases/${draft.id}`, method: 'PATCH' }
    const req = https.request(patchOpts, (r) => {
      let b = ''; r.on('data', d => b += d)
      r.on('end', () => {
        const rel = JSON.parse(b)
        console.log(`Published: ${rel.html_url}`)
      })
    })
    req.write(JSON.stringify({ draft: false }))
    req.end()
  })
})
