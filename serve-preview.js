const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = 5500;

const server = http.createServer((req, res) => {
  const filePath = path.join(root, req.url === '/' ? 'preview.html' : req.url);
  const safePath = path.normalize(filePath);
  if (!safePath.startsWith(root)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(safePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(safePath);
    const type =
      ext === '.html' ? 'text/html' :
      ext === '.css' ? 'text/css' :
      ext === '.js' ? 'text/javascript' : 'text/plain';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Preview at http://127.0.0.1:${port}/preview.html`);
});
