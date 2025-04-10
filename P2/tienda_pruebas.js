const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8001;
const tiendaPath = path.join(__dirname, 'tienda.json');

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

function cargarDatos() {
  return JSON.parse(fs.readFileSync(tiendaPath, 'utf-8'));
}

function guardarDatos(data) {
  fs.writeFileSync(tiendaPath, JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Ruta principal - Lista de productos
  if (req.method === 'GET' && url.pathname === '/') {
    const tienda = cargarDatos();
    let html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Tienda</title></head><body>`;
    html += `<h1>Bienvenido a V-Games</h1><a href="/login">Login</a> | <a href="/checkout">Carrito</a><hr><ul>`;
    tienda.productos.forEach(p => {
      html += `<li><a href="/producto/${encodeURIComponent(p.nombre)}">${p.nombre}</a> - $${p.precio}</li>`;
    });
    html += `</ul><form action="/buscar" method="get"><input type="text" name="q" placeholder="Buscar..."><button type="submit">Buscar</button></form></body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // Página de producto individual
  if (req.method === 'GET' && url.pathname.startsWith('/producto/')) {
    const nombreProducto = decodeURIComponent(url.pathname.split('/producto/')[1]);
    const tienda = cargarDatos();
    const producto = tienda.productos.find(p => p.nombre === nombreProducto);
    if (!producto) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>Producto no encontrado</h1>');
      return;
    }
    const html = `<!DOCTYPE html><html><head><title>${producto.nombre}</title></head><body>
      <h1>${producto.nombre}</h1>
      <p>${producto.descripcion}</p>
      <p>Precio: $${producto.precio}</p>
      <p>Stock: ${producto.stock}</p>
      <form method="post" action="/carrito">
        <input type="hidden" name="producto" value="${producto.nombre}">
        <button type="submit" ${producto.stock === 0 ? 'disabled' : ''}>Añadir al carrito</button>
      </form>
      <a href="/">Volver</a></body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // Página de login
  if (req.method === 'GET' && url.pathname === '/login') {
    const html = `<!DOCTYPE html><html><head><title>Login</title></head><body>
      <h1>Iniciar sesión</h1>
      <form method="POST" action="/login">
        <input type="text" name="usuario" placeholder="Nombre de usuario" required>
        <button type="submit">Entrar</button>
      </form>
      <a href="/">Volver</a>
    </body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // Procesar login
  if (req.method === 'POST' && url.pathname === '/login') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const usuario = params.get('usuario');
      const tienda = cargarDatos();
      const existe = tienda.usuarios.some(u => u.nombre === usuario);
      if (existe) {
        res.writeHead(302, {
          'Set-Cookie': `usuario=${usuario}`,
          'Location': '/'
        });
      } else {
        res.writeHead(401);
        res.end('Usuario no válido');
      }
      res.end();
    });
    return;
  }

  // Carrito de compras (checkout)
  if (req.method === 'GET' && url.pathname === '/checkout') {
    const html = `<!DOCTYPE html><html><head><title>Carrito</title></head><body>
      <h1>Finalizar compra</h1>
      <form method="POST" action="/checkout">
        Dirección: <input type="text" name="direccion" required><br>
        Tarjeta: <input type="text" name="tarjeta" required><br>
        <button type="submit">Confirmar</button>
      </form>
      <a href="/">Volver</a>
    </body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/checkout') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const direccion = params.get('direccion');
      const tarjeta = params.get('tarjeta');
      const usuario = req.headers.cookie?.split(';').find(c => c.trim().startsWith('usuario='))?.split('=')[1];
      if (!usuario) {
        res.writeHead(401);
        res.end('Debe iniciar sesión');
        return;
      }
      const tienda = cargarDatos();
      const carrito = JSON.parse(fs.readFileSync('carrito.json', 'utf8'))[usuario] || [];
      const nuevoPedido = {
        usuario,
        direccion,
        tarjeta,
        productos: carrito
      };
      tienda.pedidos.push(nuevoPedido);
      guardarDatos(tienda);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Pedido realizado con éxito</h1><a href="/">Volver</a>');
    });
    return;
  }

    // Servir archivos estáticos desde /public
    const staticPath = path.join(__dirname, 'public');
    const staticFilePath = path.join(staticPath, decodeURIComponent(url.pathname));
  
    if (
      fs.existsSync(staticFilePath) &&
      fs.statSync(staticFilePath).isFile()
    ) {
      const ext = path.extname(staticFilePath).toLowerCase();
      const contentType = {
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.ico': 'image/x-icon',
        '.svg': 'image/svg+xml'
      }[ext] || 'application/octet-stream';
  
      res.writeHead(200, { 'Content-Type': contentType });
      return fs.createReadStream(staticFilePath).pipe(res);
    }
  

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 - Página no encontrada');
});

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`Servidor disponible en:`);
  console.log(`➤ Local:   http://localhost:${PORT}`);
  console.log(`➤ Red:     http://${localIP}:${PORT}`);
});