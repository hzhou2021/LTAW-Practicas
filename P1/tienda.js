const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8001;
const ROOT_DIR = path.join(__dirname, 'public');

// Función para obtener la IP local de la máquina
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        for (const config of iface) {
            if (config.family === 'IPv4' && !config.internal) {
                return config.address; // Retorna la IP local de la red
            }
        }
    }
    return 'localhost'; // En caso de no encontrar una IP válida
}

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    let sanitizedPath = path.normalize(req.url).replace(/^(\.\.[/\\])+/, '');
    let filePath = path.join(ROOT_DIR, sanitizedPath);

    if (req.url === '/' || req.url === '/index.html') {
        filePath = path.join(ROOT_DIR, "index.html");
    }

    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                const notFoundPage = path.join(ROOT_DIR, "404.html");
                fs.readFile(notFoundPage, (err404, data404) => {
                    if (err404) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('404 - Página no encontrada');
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end(data404, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 - Error interno del servidor');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data, 'utf-8');
        }
    });
});

// Escuchar en todas las interfaces de red (0.0.0.0)
server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log(`Servidor disponible en:`);
    console.log(`➤ Local:   http://localhost:${PORT}`);
    console.log(`➤ Red:     http://${localIP}:${PORT}`);
});
