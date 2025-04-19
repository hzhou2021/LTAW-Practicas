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
