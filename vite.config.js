import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Simple Vite plugin to run Vercel Serverless Functions locally
const vercelApiPlugin = () => {
  return {
    name: 'vercel-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith('/api/')) {
          try {
            const routePath = req.url.split('?')[0];
            const filePath = path.join(__dirname, routePath + '.js');
            
            if (fs.existsSync(filePath)) {
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

export default defineConfig({
  plugins: [react(), vercelApiPlugin()],
  envPrefix: ['VITE_', 'SUPABASE_'],
  server: {
    port: 8080,
    host: true,
    cors: true
  }
})
