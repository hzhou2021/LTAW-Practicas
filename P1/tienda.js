const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8001;
const ROOT_DIR = path.join(__dirname, 'public');

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif'
};

const server = http.createServer((req, res) => {
    let filePath = path.join(ROOT_DIR, req.url);
    if (req.url === '/') {
        filePath = path.join(ROOT_DIR, 'index.html');
    }

    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                fs.readFile(path.join(ROOT_DIR, '404.html'), (error, content) => {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(content || '<h1>404 - Página no encontrada</h1>', 'utf-8');
                });
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error interno del servidor', 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
