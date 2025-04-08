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
    // Normalización de la URL solicitada para prevenir acceso no autorizado
    let sanitizedPath = path.normalize(req.url).replace(/^(\.\.[/\\])+/, '');
    let filePath = path.join(ROOT_DIR, sanitizedPath);

    //
    if (req.url === '/ls') {
        fs.readdir(__dirname, (err, files) => {  // Listar archivos en la carpeta raíz
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


    // Solicitud para la raiz
    if (req.url === '/' || req.url === '/index.html') {
        const jsonPath = path.join(__dirname, 'tienda.json');
        fs.readFile(jsonPath, 'utf8', (err, jsonData) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                return res.end('Error leyendo tienda.json');
            }

            const tienda = JSON.parse(jsonData);
            const productosHTML = tienda.productos.map(producto => `
                    <article class="producto">
                        <img src="${producto.imagen}" alt="${producto.nombre}">
                        <h2>${producto.nombre}</h2>
                        <a href="${producto.nombre.toLowerCase().replace(/\s+/g, '')}.html">Ver más</a>
                    </article>
                `).join('');

            const html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Tienda Dinámica</title>
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
                </html>
                `;

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        });
        return;


    }

    // Generar páginas individuales para productos desde tienda.json
    const jsonPath = path.join(__dirname, 'tienda.json');

    fs.readFile(jsonPath, 'utf8', (err, data) => {
        if (err) return console.error('❌ Error leyendo tienda.json:', err);

        const tienda = JSON.parse(data);

        tienda.productos.forEach(producto => {
            const nombreArchivo = producto.nombre.toLowerCase().replace(/\s+/g, '') + '.html';
            const rutaArchivo = path.join(ROOT_DIR, nombreArchivo);

            const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${producto.nombre} - V-Games</title>
                <link rel="icon" type="image/x-icon" href="/favicon.ico">
                <link rel="stylesheet" href="games.css">
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
                        <img src="${producto.imagen}" alt="${producto.nombre}">
                        <div class="informacion">
                            <h1>${producto.nombre}</h1>
                            <p class="descripcion">${producto.descripcion}</p>
                            <ul>
                                <li><strong>Género:</strong> Acción/Aventura</li>
                                <li><strong>Plataforma:</strong> PC, Consolas</li>
                                <li><strong>Precio:</strong> $${producto.precio.toFixed(2)}</li>
                            </ul>
                            <a href="compra.html" class="boton-compra">Comprar ahora</a>
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

            fs.writeFile(rutaArchivo, html, err => {
                if (err) {
                    console.error(`❌ Error creando ${nombreArchivo}:`, err);
                } else {
                    console.log(`✅ Página creada: ${nombreArchivo}`);
                }
            });
        });
    });


    const extname = path.extname(filePath); // Obtención de la extensión del archivo solicitado
    const contentType = mimeTypes[extname] || 'application/octet-stream'; // Asignación del tipo MIME según la extensión del archivo
    // Lectura del archivo solicitado
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Si el archivo no se encuentra, mostramos una página 404
                const notFoundPage = path.join(ROOT_DIR, "404.html");
                fs.readFile(notFoundPage, (err404, data404) => {
                    if (err404) {
                        // Si no podemos leer la página 404, respondemos con un error 404 en texto plano
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('404 - Página no encontrada');
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end(data404, 'utf-8');
                    }
                });
            } else {
                // Si hay un error interno en el servidor, respondemos con un error 500
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 - Error interno del servidor');
            }
        } else {
            // Si el archivo se encuentra y se lee correctamente, lo enviamos con el tipo MIME adecuado
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
