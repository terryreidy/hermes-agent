import { createServer as createHttpServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const nodesPath = path.join(root, 'src', 'data', 'nodes.json')
const host = process.env.ADMIN_HOST ?? '0.0.0.0'
const port = Number(process.env.ADMIN_PORT ?? 5177)

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload, null, 2))
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      body += chunk
      if (body.length > 2_000_000) {
        reject(new Error('Request body is too large'))
        request.destroy()
      }
    })
    request.on('end', () => resolve(body))
    request.on('error', reject)
  })
}

function normalizeNodesPayload(payload) {
  if (!Array.isArray(payload)) {
    throw new Error('nodes.json must be an array')
  }

  return payload.map((node, index) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      throw new Error(`Node ${index + 1} must be an object`)
    }
    if (typeof node.title !== 'string' || !node.title.trim()) {
      throw new Error(`Node ${index + 1} is missing a title`)
    }
    if (typeof node.summary !== 'string' || !node.summary.trim()) {
      throw new Error(`Node ${index + 1} is missing a summary`)
    }
    return node
  })
}

async function handleApi(request, response) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, nodesPath })
    return true
  }

  if (url.pathname !== '/api/nodes') {
    return false
  }

  try {
    if (request.method === 'GET') {
      const rawNodes = await readFile(nodesPath, 'utf8')
      sendJson(response, 200, {
        ok: true,
        path: nodesPath,
        nodes: JSON.parse(rawNodes),
      })
      return true
    }

    if (request.method === 'POST') {
      const body = await readRequestBody(request)
      const parsed = JSON.parse(body)
      const nodes = normalizeNodesPayload(parsed.nodes ?? parsed)
      await writeFile(nodesPath, `${JSON.stringify(nodes, null, 2)}\n`)
      sendJson(response, 200, {
        ok: true,
        path: nodesPath,
        count: nodes.length,
        savedAt: new Date().toISOString(),
      })
      return true
    }

    sendJson(response, 405, { ok: false, error: 'Method not allowed' })
    return true
  } catch (error) {
    sendJson(response, 400, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown API error',
    })
    return true
  }
}

const vite = await createViteServer({
  root,
  server: {
    middlewareMode: true,
    hmr: { server: undefined },
    watch: { ignored: [nodesPath] },
  },
  appType: 'spa',
})

const server = createHttpServer(async (request, response) => {
  if (await handleApi(request, response)) {
    return
  }

  vite.middlewares(request, response)
})

server.listen(port, host, () => {
  console.log(`Network archive admin: http://localhost:${port}/admin.html`)
  console.log(`Writing nodes JSON to: ${nodesPath}`)
})
