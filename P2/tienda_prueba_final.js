const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8007;
const ROOT_DIR = path.join(__dirname, 'public');

// Función para obtener la IP local de la máquina
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

// Simplificación de URL para evitar erroes de caracteres. 
function slugify(nombre) {
    return nombre
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
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
    let sanitizedPath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(ROOT_DIR, sanitizedPath);
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Ruta: /ls → Listado de archivos
    if (req.url === '/ls') {
        fs.readdir(__dirname, (err, files) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                return res.end('500 - Error interno del servidor');
            }

            const html = `
                <html>
                <head>
                    <title>Lista de Archivos</title>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f4f4f4; text-align: center; }
                        h1 { color: #333; }
                        ul { list-style: none; padding: 0; }
                        li { margin: 5px; background: #fff; padding: 10px; border-radius: 5px; }
                        a { text-decoration: none; color: #27ae60; font-weight: bold; }
                        a:hover { color: #2ecc71; }
                    </style>
                </head>
                <body>
                    <h1>Lista de Archivos en el Proyecto</h1>
                    <ul>${files.map(file => `<li><a href="/${file}">${file}</a></li>`).join('')}</ul>
                    <br><a href="/">Volver a la Pagina Principal</a>
                </body>
                </html>`;
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end(html);
        });
        return;
    }

    // Ruta raíz o index
    if (req.url === '/' || req.url === '/index.html') {
        const jsonPath = path.join(__dirname, 'tienda.json');
        fs.readFile(jsonPath, 'utf8', (err, jsonData) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                return res.end('500 - Error interno del servidor');
            }

            const tienda = JSON.parse(jsonData);
            const productosHTML = tienda.productos.map(producto => `
                <article class="producto">
                    <img src="${producto.imagen}" alt="${producto.nombre}">
                    <h2>${producto.nombre}</h2>
                    <a href="/producto/${slugify(producto.nombre)}">Ver más</a>
                </article>
            `).join('');

            const html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>V-Games</title>
                    <link rel="icon" type="image/x-icon" href="/favicon.ico">
                    <link rel="stylesheet" href="/styles.css">
                </head>
                <body>
                    <header class="Titulo">
                        <div>V-Games</div>
                        <div class="iconos">
                            <a href="#">👤</a>
                            <a href="#">🛒</a>
                        </div>
                    </header>
                    <main>
                        <section class="productos">
                            ${productosHTML}
                        </section>
                    </main>
                    <footer>
                        <div class="footer-contenido">
                            <p>&copy; 2025 V-Games. Todos los derechos reservados.</p>
                            <p>Contacto: <a href="mailto:contacto@mitienda.com">contacto@mitienda.com</a></p>
                        </div>
                    </footer>
                </body>
                </html>`;
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        });
        return;
    }

    // Ruta dinámica para productos: /producto/slug
    if (req.url.startsWith('/producto/')) {
        const slug = req.url.replace('/producto/', '').toLowerCase();
        const jsonPath = path.join(__dirname, 'tienda.json');

        fs.readFile(jsonPath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                return res.end('500 - Error interno del servidor');
            }

            const tienda = JSON.parse(data);
            const producto = tienda.productos.find(p => slugify(p.nombre) === slug);

            const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${producto.nombre} - V-Games</title>
                <link rel="icon" type="image/x-icon" href="/favicon.ico">
                <link rel="stylesheet" href="/games.css">
            </head>
            <body>
                <header>
                    <a href="/" class="Volver">Volver al inicio</a>
                    <div class="iconos">
                        <a href="#">👤</a>
                        <a href="#">🛒</a>
                    </div>
                </header>
                
                <main class="producto-detalle">
                    <section class="detalle-producto">
                        <img src="/${producto.imagen}" alt="${producto.nombre}">
                        <div class="informacion">
                            <h1>${producto.nombre}</h1>
                            <p class="descripcion">${producto.descripcion}</p>
                            <ul>
                                <li><strong>Género:</strong> ${producto.genero}</li>
                                <li><strong>Precio:</strong> ${producto.precio > 0 ? `$${producto.precio.toFixed(2)}` : 'Gratis'}</li>
                                <li><strong>Stock disponible:</strong> ${producto.stock}</li>
                            </ul>
                            ${producto.stock > 0
                    ? `<a href="compra.html" class="boton-compra">Comprar ahora</a>`
                    : `<span class="agotado">Producto agotado</span>`
                }
                        </div>
                    </section>
                </main>

                <footer>
                    <div class="footer-contenido">
                        <p>&copy; 2025 V-Games. Todos los derechos reservados.</p>
                        <p>Contacto: <a href="mailto:contacto@mitienda.com">contacto@mitienda.com</a></p>
                    </div>
                </footer>
            </body>
            </html>
            `;
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        });
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                return res.end(`
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                        <meta charset="UTF-8">
                        <title>404 - Página No Encontrada</title>
                        <link rel="stylesheet" href="/styles_404.css">
                    </head>
                    <body>
                        <div class="container">
                            <img class="img-404" src="https://i.imgur.com/qIufhof.png" alt="404 Error">
                            <h1>404</h1>
                            <h2>Oops! Página no encontrada</h2>
                            <p>Lo sentimos, pero la página que buscas no existe o ha sido movida.</p>
                            <a href="/">Volver al inicio</a>
                        </div>
                    </body>
                    </html>`);
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                return res.end('500 - Error interno del servidor');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });

});

server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log(`Servidor disponible en:`);
    console.log(`➤ Local:   http://localhost:${PORT}`);
    console.log(`➤ Red:     http://${localIP}:${PORT}`);
});
