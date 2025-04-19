const socket = io();

const display = document.getElementById("display");
const msgEntry = document.getElementById("msg_entry");
const chatForm = document.getElementById("chat-form");
const typingIndicator = document.getElementById("typing");
const nicknameDisplay = document.getElementById("nickname");
const userList = document.getElementById("user-list");
const notifSound = document.getElementById("notif-sound");
