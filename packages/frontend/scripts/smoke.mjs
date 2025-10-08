import { preview } from 'vite'

async function main() {
  let server
  try {
    // Start a preview server on an ephemeral port
    server = await preview({
      preview: {
        port: 0,
        host: '127.0.0.1',
        strictPort: false,
      },
    })

    const url = (server.resolvedUrls?.local?.[0]) || (() => {
      const addr = server.httpServer.address()
      const port = typeof addr === 'object' && addr ? addr.port : 4173
      return `http://127.0.0.1:${port}`
    })()

    const toStatus = (r) => `${r.status}${r.statusText ? ' ' + r.statusText : ''}`

    const homeResp = await fetch(url)
    if (!homeResp.ok) throw new Error(`Home fetch failed: ${toStatus(homeResp)}`)
    const html = await homeResp.text()
    const m = html.match(/\/assets\/[^"]+\.js/)
    if (!m) throw new Error('No asset script found in index.html')
    const assetUrl = url.replace(/\/$/, '') + m[0]
    const assetResp = await fetch(assetUrl)
    if (!assetResp.ok) throw new Error(`Asset fetch failed: ${toStatus(assetResp)} (${assetUrl})`)

     
    console.log(`SMOKE OK url=${url} home=${homeResp.status} asset=${assetResp.status} path=${m[0]}`)
  } catch (err) {
     
    console.error('SMOKE FAIL', err)
    process.exitCode = 1
  } finally {
    if (server?.httpServer) {
      await new Promise((resolve) => server.httpServer.close(() => resolve()))
    }
  }
}

main()

