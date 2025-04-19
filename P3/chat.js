const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const colors = require('colors');

const PORT = 8080;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(__dirname + '/public'));

let users = {};

function getUserList() {
  return Object.values(users);
}