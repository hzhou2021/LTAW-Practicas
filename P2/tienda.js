const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8001;
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

function getCartForUser(nombreUsuario) {
    const tienda = JSON.parse(fs.readFileSync('tienda.json', 'utf-8'));
    return tienda.carritos?.[nombreUsuario] || [];
}

function saveCartForUser(nombreUsuario, carritoArray) {
    const tienda = JSON.parse(fs.readFileSync('tienda.json', 'utf-8'));
    tienda.carritos = tienda.carritos || {};
    tienda.carritos[nombreUsuario] = carritoArray;
    fs.writeFileSync('tienda.json', JSON.stringify(tienda, null, 2));
}

function contarCarrito(req) {
    const user = getUserFromCookie(req);
    if (!user) return 0;

    const tienda = JSON.parse(fs.readFileSync('tienda.json', 'utf-8'));
    const carrito = tienda.carritos?.[user] || [];
    return carrito.length;
}

function obtenerLoginHTML(user, req) {
    const totalCarrito = contarCarrito(req);
    const carritoHTML = `<a href="/checkout">🛒 <span id="contador-carrito">${totalCarrito}</span></a>`;

    return user
        ? `
        <div class="usuario-sesion">
            <span class="nombre-usuario">👤 ${user}</span>
            <button class="boton-salir" onclick="cerrarSesion()">Salir</button>
            ${carritoHTML}
        </div>

        <script>
            function cerrarSesion() {
                fetch('/logout', { method: 'POST' })
                    .then(() => location.reload());
            }
        </script>
        `
        : `
        <a href="#" onclick="abrirLogin()"> 👤Iniciar sesión</a>
        <div id="modalLogin" class="modal-login">
            <h3>Iniciar sesión</h3>
            <input type="text" id="usuario" placeholder="Usuario"><br>
            <input type="password" id="clave" placeholder="Contraseña"><br><br>
            <button onclick="enviarLogin()">Entrar</button>
            <button onclick="cerrarLogin()">Cancelar</button>
            <p id="errorLogin" style="color:red;"></p>
        </div>

        <script>
            function abrirLogin() {
                document.getElementById('modalLogin').style.display = 'block';
            }
            function cerrarLogin() {
                document.getElementById('modalLogin').style.display = 'none';
                document.getElementById('errorLogin').textContent = '';
            }
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
            document.getElementById('modalLogin').addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    event.preventDefault();  
                    enviarLogin();
                }
            });
        </script>`;
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

    // Página principal de mi web 
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

            const loginHTML = obtenerLoginHTML(user, req);

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
                        <div class="iconos">${loginHTML}<a href="#"></a></div>
                    </header>
                    <main>
                        <div class="busqueda-autocompletar">
                            <input type="text" id="busqueda" placeholder="Buscar producto..." autocomplete="off">
                            <ul id="sugerencias"></ul>
                        </div>
                        <section class="productos">${productosHTML}</section>
                    </main>
                    <footer>
                        <p>&copy; 2025 V-Games. Todos los derechos reservados.</p>
                        <p>Contacto: <a href="mailto:contacto@mitienda.com">contacto@mitienda.com</a></p>
                    </footer>
                    <script>
                        document.getElementById('busqueda').addEventListener('input', async function () {
                            const query = this.value.trim();
                            const sugerencias = document.getElementById('sugerencias');
                            sugerencias.innerHTML = '';

                            if (query.length >= 3) {
                                const res = await fetch('/buscar?q=' + encodeURIComponent(query));
                                const resultados = await res.json();

                                resultados.forEach(prod => {
                                    const li = document.createElement('li');
                                    li.textContent = prod.nombre;
                                    li.addEventListener('click', () => {
                                        window.location.href = '/producto/' + prod.slug;
                                    });
                                    sugerencias.appendChild(li);
                                });
                            }
                        });
                    </script>
                </body>

                </html>`;

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        });
        return;
    }

    // Ruta: Para el Login
    if (req.method === 'POST' && req.url === '/login') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const { nombre, clave } = JSON.parse(body);
            const tienda = JSON.parse(fs.readFileSync('tienda.json', 'utf-8'));
            const usuario = tienda.usuarios.find(u => u.nombre === nombre && u.clave === clave);
            if (usuario) {
                res.setHeader('Set-Cookie', `user=${usuario.nombre}; HttpOnly; SameSite=Strict`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
            } else {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false }));
            }
        });
        return;
    }

    // Ruta: Para el logout
    if (req.method === 'POST' && req.url === '/logout') {
        res.setHeader('Set-Cookie', 'user=; Max-Age=0; HttpOnly; SameSite=Strict');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    // Ruta: Buscador de productos
    if (req.method === 'GET' && req.url.startsWith('/buscar')) {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const termino = urlObj.searchParams.get('q')?.toLowerCase() || '';

        if (termino.length < 3) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify([]));
        }

        const tienda = JSON.parse(fs.readFileSync('tienda.json', 'utf-8'));
        const coincidencias = tienda.productos.filter(p =>
            p.nombre.toLowerCase().includes(termino)
        ).map(p => ({
            nombre: p.nombre,
            slug: slugify(p.nombre)
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(coincidencias));
    }

    // Página de cada producto
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

            const loginHTML = obtenerLoginHTML(user, req);
            const botonCompra = producto.stock > 0
                ? (user ? `
                <button class="boton-compra" onclick="agregarAlCarrito('${producto.nombre}')">Añadir al carrito</button>
                <script>
                function agregarAlCarrito(nombre) {
                    fetch('/add-to-cart?producto=' + encodeURIComponent(nombre))
                        .then(() => {
                            const contador = document.querySelector('#contador-carrito');
                            if (contador) {
                                let actual = parseInt(contador.textContent || '0');
                                contador.textContent = actual + 1;
                            }
                        });
                }
                </script>
                `
                    : `<p class="mensaje-login">Inicia sesión para comprar</p>`)
                : `<span class="productoStock">Producto agotado</span>`;
            const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${producto.nombre} - V-Games</title>
                <link rel="icon" type="image/x-icon" href="/favicon.ico">
                <link rel="stylesheet" href="/styles.css">
            </head>
            <body>
                <header>
                    <a href="/" class="Volver">Volver al inicio</a>
                    <div class="iconos">
                        ${loginHTML}<a href="#"></a>
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
                            ${botonCompra}
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

    // Ruta: Añadir al carrito
    if (req.url.startsWith('/add-to-cart')) {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const producto = urlObj.searchParams.get('producto');
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'text/html' });
            return res.end('<h1>No autorizado</h1><p>Debes iniciar sesión para añadir al carrito.</p><a href="/">Volver</a>');
        }
        const cart = getCartForUser(user);
        cart.push(producto);
        saveCartForUser(user, cart);
        res.writeHead(302, { Location: '/' });
        res.end();
        return;
    }

    // Ruta: Descontar del carrito
    if (req.method === 'GET' && req.url.startsWith('/remove-from-cart')) {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const producto = urlObj.searchParams.get('producto');

        if (!user) {
            res.writeHead(401, { 'Content-Type': 'text/html' });
            return res.end('<h1>No autorizado</h1><p>Debes iniciar sesión para modificar el carrito.</p><a href="/">Volver</a>');
        }

        const carrito = getCartForUser(user);
        const index = carrito.indexOf(producto);
        if (index !== -1) {
            carrito.splice(index, 1); // elimina una sola aparición
            saveCartForUser(user, carrito);
        }

        res.writeHead(302, { Location: '/checkout' });
        res.end();
        return;
    }

    // Ruta: Checkout GET
    if (req.method === 'GET' && req.url === '/checkout') {
        const cart = getCartForUser(user);
        const tienda = JSON.parse(fs.readFileSync('tienda.json', 'utf-8'));
        const productos = tienda.productos;

        const resumen = cart.map(nombre => productos.find(p => p.nombre === nombre)).filter(Boolean);
        const resumenHTML = resumen.map(p => `
            <li>
                ${p.nombre} - $${p.precio.toFixed(2)}
                <a href="/remove-from-cart?producto=${encodeURIComponent(p.nombre)}">❌</a>
            </li>
        `).join('');

        const total = resumen.reduce((sum, p) => sum + p.precio, 0).toFixed(2);

        const html = `
        <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Checkout</title></head><body>
        <link rel="stylesheet" href="/checkout.css">
        <h1>Checkout</h1>
        <ul>${resumenHTML}</ul>
        <p>Total: $${total}</p>
        <form method="POST" action="/checkout">
            <label>Dirección de envío: <input name="direccion" required></label><br>
            <label>Número de tarjeta: <input name="tarjeta" required></label><br><br>
            <button type="submit">Finalizar compra</button>
        </form>
        <a href="/">Volver</a>
        </body></html>`;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;
    }

    // Ruta: Checkout POST
    if (req.method === 'POST' && req.url === '/checkout') {
        const user = getUserFromCookie(req);

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const direccion = params.get('direccion');
            const tarjeta = params.get('tarjeta');

            const tienda = JSON.parse(fs.readFileSync('tienda.json', 'utf-8'));
            const productos = tienda.productos;

            const carritoUsuario = tienda.carritos?.[user] || [];
            const resumen = carritoUsuario.map(nombre => productos.find(p => p.nombre === nombre)).filter(Boolean);

            // Verificar stock
            const sinStock = resumen.some(p => p.stock <= 0);
            if (sinStock) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                return res.end('<h1>Fallo en la compra</h1><p>Uno o más productos están sin stock.</p><a href="/">Volver</a>');
            }

            // Descontar stock
            resumen.forEach(p => p.stock--);

            // Guardar pedido
            const nuevoPedido = {
                nombre: user,
                direccion: direccion,
                tarjeta: tarjeta,
                productos: resumen.map(p => p.nombre)
            };
            tienda.pedidos = tienda.pedidos || [];
            tienda.pedidos.push(nuevoPedido);

            // Vaciar carrito del usuario
            tienda.carritos[user] = [];

            // Guardar cambios
            fs.writeFileSync('tienda.json', JSON.stringify(tienda, null, 2));

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<div class="gracias-container"><link rel="stylesheet" href="/styles.css"><h1>Gracias por tu compra</h1><a href="/">Volver al inicio</a></div>');
        });
        return;
    }
    // Listado de archivos
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
    // Página de Error 404
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