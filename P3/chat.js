const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const os = require('os');
require('colors');

const PORT = 8080;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(__dirname + '/public'));

let users = {};

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

function getUserList() {
  return Object.values(users);
}

io.on('connection', (socket) => {
  console.log(`** NUEVA CONEXIÓN (${socket.id}) **`.yellow);

  // Asignar nickname temporal
  users[socket.id] = 'Usuario-' + socket.id.substring(0, 4);

  // Enviar mensaje privado de bienvenida
  socket.emit('message', `👋 Bienvenido al chat, ${users[socket.id]}! Escribe /help para ver los comandos.`);

  // Notificar a otros
  socket.broadcast.emit('message', `🔔 ${users[socket.id]} se ha conectado`);

  // Actualizar lista de usuarios conectados
  io.emit('userList', getUserList());

  // Evento de mensaje
  socket.on('message', (msg) => {
    // Comandos
    if (msg.startsWith('/')) {
      const args = msg.split(' ');
      const command = args[0].toLowerCase();

      switch (command) {
        case '/help':
          socket.emit('message', `
            🛠️ Comandos disponibles:
            /help - Lista de comandos
            /list - Usuarios conectados
            /hello - Saludo del servidor
            /date - Fecha actual
            /nick "nuevo_nombre"      -Cambiar tu nickname
            /dm "usuario" "mensaje"       -Enviar mensaje directo
          `);
          break;

        case '/list':
          socket.emit('message', `👥 Usuarios conectados: ${getUserList().join(', ')}`);
          break;

        case '/hello':
          socket.emit('message', `👋 ¡Hola, ${users[socket.id]}!`);
          break;

        case '/date':
          socket.emit('message', `📅 Fecha actual: ${new Date().toLocaleString()}`);
          break;

        case '/nick':
          if (args[1]) {
            const oldNick = users[socket.id];
            const newNick = args[1];
            users[socket.id] = newNick;
            socket.emit('message', `✅ Nickname actualizado: ${oldNick} → ${newNick}`);
            io.emit('userList', getUserList());
          } else {
            socket.emit('message', `❌ Debes escribir un nuevo nickname. Ej: /nick MiNombre`);
          }
          break;

        case '/dm':
          const targetName = args[1];
          const message = args.slice(2).join(' ');
          const targetSocketId = Object.keys(users).find(id => users[id] === targetName);
          if (targetSocketId && message) {
            const sender = users[socket.id];
            io.to(targetSocketId).emit('privateMessage', { from: sender, to: targetName, text: message });
            socket.emit('privateMessage', { from: sender, to: targetName, text: message });
          } else {
            socket.emit('message', `❌ Usuario no encontrado o mensaje vacío.`);
          }
          break;


        default:
          socket.emit('message', `❓ Comando desconocido. Escribe /help para ver opciones.`);
      }

    } else {
      // Mensaje normal, reenviarlo a todos
      io.emit('message', `💬 ${users[socket.id]}: ${msg}`);
    }
  });

  // Indicador de escritura
  socket.on('typing', (status) => {
    socket.broadcast.emit('typing', {
      user: users[socket.id],
      status
    });
  });

  socket.on('disconnect', () => {
    console.log(`** CONEXIÓN TERMINADA (${socket.id}) **`.red);
    socket.broadcast.emit('message', `❌ ${users[socket.id]} se ha desconectado`);
    delete users[socket.id];
    io.emit('userList', getUserList());
  });
});

// ACceso al chat
server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`Servidor disponible en:`);
  console.log(`➤ Local:   http://localhost:${PORT}`);
  console.log(`➤ Red:     http://${localIP}:${PORT}`);
});
