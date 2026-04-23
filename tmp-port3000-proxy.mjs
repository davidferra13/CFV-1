import http from 'node:http'

const targetHost = '127.0.0.1'
const targetPort = 3100

const server = http.createServer((req, res) => {
  const headers = {
    ...req.headers,
    host: `${targetHost}:${targetPort}`,
    'x-forwarded-host': req.headers.host || '',
    'x-forwarded-proto': 'https',
    'x-forwarded-port': '443',
  }

  const proxyReq = http.request(
    {
      hostname: targetHost,
      port: targetPort,
      path: req.url,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
      proxyRes.pipe(res)
    }
  )

  proxyReq.on('error', (error) => {
    res.statusCode = 502
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    res.end(`Proxy error: ${error.message}`)
  })

  req.pipe(proxyReq)
})

server.on('clientError', (_error, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
})

server.listen(3000, '0.0.0.0', () => {
  console.log('[tmp-port3000-proxy] listening on http://0.0.0.0:3000 -> http://127.0.0.1:3100')
})
