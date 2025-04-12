const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8007;
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

function slugify(nombre) {
    return nombre
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function getUserFromCookie(req) {
    const cookie = req.headers.cookie;
    if (!cookie) return null;
    const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('user='));
    return match ? match.split('=')[1] : null;
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
    let sanitizedPath = path.normalize(req.url).replace(/^([\.]{2}[\/\\])+/, '');
    let filePath = path.join(ROOT_DIR, sanitizedPath);
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    const user = getUserFromCookie(req);

    if (req.method === 'POST' && req.url === '/login') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const { nombre, clave } = JSON.parse(body);
            const tienda = JSON.parse(fs.readFileSync('tienda.json', 'utf-8'));
            const usuario = tienda.usuarios.find(u => u.nombre === nombre && u.clave === clave);
            if (usuario) {
                res.setHeader('Set-Cookie', `user=${usuario.nombre}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
            } else {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false }));
            }
        });
        return;
    }

    if (req.url === '/ls') {
        fs.readdir(__dirname, (err, files) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                return res.end('500 - Error interno del servidor');
            }
            const html = `
                <html><head><title>Lista</title></head><body>
                <ul>${files.map(file => `<li><a href="/${file}">${file}</a></li>`).join('')}</ul>
                </body></html>`;
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end(html);
        });
        return;
    }

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

            const loginHTML = user ? `<p>Conectado como: <b>${user}</b></p>` : `
                <a href="#" onclick="abrirLogin()">👤 Iniciar sesión</a>
                <div id="modalLogin" style="display:none; position:fixed; top:20%; left:50%; transform:translateX(-50%); padding:20px; background:#eee; border:1px solid #ccc; z-index:1000;">
                    <h3>Iniciar sesión</h3>
                    <input type="text" id="usuario" placeholder="Usuario"><br>
                    <input type="password" id="clave" placeholder="Contraseña"><br><br>
                    <button onclick="enviarLogin()">Entrar</button>
                    <button onclick="cerrarLogin()">Cancelar</button>
                    <p id="errorLogin" style="color:red;"></p>
                </div>
                <script>
                function abrirLogin() { document.getElementById('modalLogin').style.display = 'block'; }
                function cerrarLogin() { document.getElementById('modalLogin').style.display = 'none'; document.getElementById('errorLogin').textContent = ''; }
                async function enviarLogin() {
                    const nombre = document.getElementById('usuario').value;
                    const clave = document.getElementById('clave').value;
                    const res = await fetch('/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nombre, clave })
                    });
                    const data = await res.json();
                    if (data.ok) location.reload();
                    else document.getElementById('errorLogin').textContent = 'Usuario o contraseña incorrectos';
                }
                </script>`;

            const html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>V-Games</title>
                    <link rel="stylesheet" href="/styles.css">
                </head>
                <body>
                    <header class="Titulo">
                        <div>V-Games</div>
                        <div class="iconos">${loginHTML}<a href="#">🛒</a></div>
                    </header>
                    <main><section class="productos">${productosHTML}</section></main>
                    <footer><p>&copy; 2025 V-Games</p></footer>
                </body>
                </html>`;

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        });
        return;
    }

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
                return res.end('<h1>404 - Página no encontrada</h1>');
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
