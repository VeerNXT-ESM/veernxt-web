import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, parse as parseUrl } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// vercel.json's literal (non-wildcard) /api/* rewrites -- e.g.
// { source: "/api/auth/reset-password", destination: "/api/auth/account?fn=reset-password" }
// -- collapsed into a lookup this plugin can apply below. Vercel itself
// applies these in production; this local shim didn't, so every
// consolidated-router endpoint (register, reset-password, the v1/chat and
// payments routes) 404'd here even though it worked when actually deployed.
// Only literal sources are handled -- the catch-all `/api/(.*)` and
// `/(.*)` rewrites at the end of vercel.json need no translation, since
// this plugin's existing 1:1 file lookup already covers that case.
const API_REWRITES = (() => {
  const vercelConfigPath = path.join(__dirname, 'vercel.json')
  const raw = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'))
  const map = new Map()
  for (const rule of raw.rewrites || []) {
    if (!rule.source.startsWith('/api/') || rule.source.includes('(')) continue
    const [destPath, destQuery] = rule.destination.split('?')
    map.set(rule.source, { destPath, destQuery: destQuery ? parseUrl('?' + destQuery, true).query : {} })
  }
  return map
})()

// Simple Vite plugin to run Vercel Serverless Functions locally
const vercelApiPlugin = () => {
  return {
    name: 'vercel-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith('/api/')) {
          try {
            const routePath = req.url.split('?')[0];
            const rewrite = API_REWRITES.get(routePath);
            const targetPath = rewrite ? rewrite.destPath : routePath;
            const filePath = path.join(__dirname, targetPath + '.js');

            if (fs.existsSync(filePath)) {
              // Vercel's real runtime parses ?query=params onto req.query —
              // this local shim didn't, so any GET route reading req.query
              // (e.g. api/exams.js) silently got undefined here. A matched
              // rewrite's own destination query (e.g. ?fn=reset-password)
              // is merged in too, same as Vercel does for a rewritten request.
              req.query = { ...parseUrl(req.url, true).query, ...(rewrite ? rewrite.destQuery : {}) };

              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                if (body) {
                  try { req.body = JSON.parse(body); } catch(e) {}
                }

                const moduleUrl = `file:///${filePath.replace(/\\/g, '/')}?t=${Date.now()}`;
                const { default: handler } = await import(moduleUrl);
                
                res.status = (code) => { res.statusCode = code; return res; };
                res.json = (data) => {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                };
                
                await handler(req, res);
              });
              return;
            }
          } catch(err) {
            console.error('API Error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({error: err.message}));
            return;
          }
        }
        next();
      });
    }
  }
}

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  process.env = { ...process.env, ...env }

  return {
    plugins: [react(), tailwindcss(), vercelApiPlugin()],
    envPrefix: ['VITE_', 'SUPABASE_'],
    server: {
      port: 8080,
      host: true,
      cors: true
    }
  }
})
