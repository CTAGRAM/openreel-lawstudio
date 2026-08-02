// OpenReel static host with cross-origin isolation + a media proxy so the
// COEP:require-corp editor can load our Supabase-hosted renders.
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');

// media proxy: /proxy?url=<encoded>  -> streams with CORP so the isolated app can use it
app.get('/proxy', async (req, res) => {
  const target = req.query.url;
  if (!target || !/^https:\/\//.test(target)) return res.status(400).send('bad url');
  try {
    const range = req.headers.range;
    const upstream = await fetch(target, { headers: range ? { Range: range } : {} });
    res.status(upstream.status);
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag']) {
      const v = upstream.headers.get(h); if (v) res.setHeader(h, v);
    }
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.end(buf);
  } catch (e) { res.status(502).send('proxy error: ' + e.message); }
});

// cross-origin isolation for WebCodecs / SharedArrayBuffer
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use(express.static(DIST));
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
app.listen(process.env.PORT || 8000, () => console.log('openreel host on', process.env.PORT || 8000));
