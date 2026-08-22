/**
 * Local Development Server for Solstice Check-In Kiosk Prototype
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const checkInHandler = require('./api/check-in');
const statusHandler = require('./api/status');
const webhookHandler = require('./api/webhooks/print-complete');

const PORT = 3001;

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const pathname = parsedUrl.pathname;

  if (req.method === 'POST') {
    let bodyText = '';
    req.on('data', chunk => { bodyText += chunk.toString(); });
    await new Promise(resolve => req.on('end', resolve));
    try { req.body = JSON.parse(bodyText); } catch { req.body = bodyText; }
  }

  req.query = Object.fromEntries(parsedUrl.searchParams.entries());

  if (pathname === '/api/check-in') {
    return checkInHandler(req, res);
  }

  if (pathname.startsWith('/api/status')) {
    return statusHandler(req, res);
  }

  if (pathname === '/api/webhooks/print-complete') {
    return webhookHandler(req, res);
  }

  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Page Not Found" }));
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json'
    };

    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log("\n🚀 Solstice Async Check-In Kiosk running locally!");
  console.log("📡 Kiosk UI        : http://localhost:" + PORT);
  console.log("⚡ Check-In Route  : http://localhost:" + PORT + "/api/check-in");
  console.log("💓 Status Route    : http://localhost:" + PORT + "/api/status");
  console.log("🔔 Webhook Route   : http://localhost:" + PORT + "/api/webhooks/print-complete\n");
});
