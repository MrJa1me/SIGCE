const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

const AUTH_URL = process.env.AUTH_URL || 'http://localhost:3001';
const CHECKINS_URL = process.env.CHECKINS_URL || 'http://localhost:3002';
const USERS_URL = process.env.USERS_URL || 'http://localhost:3003';

app.use(cors());

function proxy(targetBase) {
  return (req, res) => {
    const url = new URL(targetBase);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: req.originalUrl,
      method: req.method,
      headers: { ...req.headers },
    };
    delete options.headers.host;

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message);
      res.status(502).json({ error: 'Bad Gateway', message: err.message });
    });
    req.pipe(proxyReq);
  };
}

// Health
app.get('/health', (req, res) => res.json({ service: 'gateway', status: 'ok' }));

// Routes
app.all('/api/login*', proxy(AUTH_URL));
app.all('/api/register*', proxy(AUTH_URL));
app.all('/api/verify*', proxy(AUTH_URL));
app.all('/api/checkins*', proxy(CHECKINS_URL));
app.all('/api/documents*', proxy(CHECKINS_URL));
app.all('/api/sync*', proxy(CHECKINS_URL));
app.all('/api/border-crossings*', proxy(USERS_URL));
app.all('/api/admin*', proxy(USERS_URL));
app.all('/api/users*', proxy(USERS_URL));

app.listen(PORT, () => {
  console.log(`Gateway on :${PORT}`);
  console.log(`  Auth     → ${AUTH_URL}`);
  console.log(`  Checkins → ${CHECKINS_URL}`);
  console.log(`  Users    → ${USERS_URL}`);
});
