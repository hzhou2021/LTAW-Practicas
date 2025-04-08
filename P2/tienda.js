const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8004;
const ROOT_DIR = path.join(__dirname, 'public');

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        for (const config of iface) {
            if (config.family === 'IPv4' && !config.internal) {
                return config.address;
            }
        }
    }
    return 'localhost';
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
    // Rutas API personalizadas
    if (req.method === "POST" && req.url === "/api/login") {
        let body = "";
        req.on("data", chunk => (body += chunk));
        req.on("end", () => {
            const { nombre } = JSON.parse(body);
            const tienda = JSON.parse(fs.readFileSync(path.join(__dirname, "tienda.json"), "utf-8"));
            const existe = tienda.usuarios.some(u => u.nombre === nombre);
            if (existe) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: true }));
            } else {
                res.writeHead(401);
                res.end();
            }
        });
        return;
    }

    if (req.method === "GET" && req.url.startsWith("/api/busqueda")) {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const query = urlObj.searchParams.get("q")?.toLowerCase();
        const tienda = JSON.parse(fs.readFileSync(path.join(__dirname, "tienda.json"), "utf-8"));
        const resultados = tienda.productos.filter(p =>
            p.nombre.toLowerCase().includes(query)
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(resultados));
        return;
    }

    if (req.method === "POST" && req.url === "/api/pedido") {
        let body = "";
        req.on("data", chunk => (body += chunk));
        req.on("end", () => {
            const nuevoPedido = JSON.parse(body);
            const rutaTienda = path.join(__dirname, "tienda.json");
            const tienda = JSON.parse(fs.readFileSync(rutaTienda, "utf-8"));
            tienda.pedidos.push(nuevoPedido);
            fs.writeFileSync(rutaTienda, JSON.stringify(tienda, null, 2));
            res.writeHead(200);
            res.end();
        });
        return;
    }

    if (req.url === '/api/productos' && req.method === 'GET') {
        const data = JSON.parse(fs.readFileSync('tienda.json', 'utf8'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data.productos));
    }
    
    let sanitizedPath = path.normalize(req.url).replace(/^([\.\/\\])+/g, '');
    let filePath = path.join(ROOT_DIR, sanitizedPath);

    if (req.url === '/ls') {
        fs.readdir(__dirname, (err, files) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                return res.end('500 - Error interno del servidor');
            }

            let fileListHTML = `
                <html>
                <head>
                    <title>Lista de Archivos</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; background-color: #f4f4f4; }
                        h1 { color: #333; }
                        ul { list-style: none; padding: 0; }
                        li { background: white; margin: 5px; padding: 10px; border-radius: 5px; box-shadow: 2px 2px 5px rgba(0,0,0,0.1); }
                        a { text-decoration: none; color: #27ae60; font-weight: bold; }
                        a:hover { color: #2ecc71; }
                    </style>
                </head>
                <body>
                    <h1>Lista de Archivos en la Carpeta del Proyecto</h1>
                    <ul>
                        ${files.map(file => `<li><a href="/${file}">${file}</a></li>`).join('')}
                    </ul>
                    <br>
                    <a href="/"> Volver a la Pagina Principal</a>
                </body>
                </html>`;

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fileListHTML);
        });
        return;
    }

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

server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log(`Servidor disponible en:`);
    console.log(`➤ Local:   http://localhost:${PORT}`);
    console.log(`➤ Red:     http://${localIP}:${PORT}`);
});