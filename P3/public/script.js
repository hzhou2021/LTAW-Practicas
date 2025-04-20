const socket = io();

let myName = '';
let activeChat = 'General';
const chats = { General: [] };

const display = document.getElementById("display");
const msgEntry = document.getElementById("msg_entry");
const chatForm = document.getElementById("chat-form");
const typingIndicator = document.getElementById("typing");
const nicknameDisplay = document.getElementById("nickname");
const userList = document.getElementById("user-list");
const notifSound = document.getElementById("notif-sound");
const chatList = document.getElementById("chat-list");

let typing = false;
let typingTimeout;

// Añadir mensaje a un chat específico
function addMessage(chat, msg) {
  if (!chats[chat]) chats[chat] = [];
  chats[chat].push(msg);
  if (chat === activeChat) renderMessages();
}

// Mostrar los mensajes del chat activo
function renderMessages() {
  display.innerHTML = '';
  chats[activeChat].forEach(msg => {
    const msgElem = document.createElement("div");
    msgElem.classList.add("message");
    msgElem.textContent = msg;
    display.appendChild(msgElem);
  });
  display.scrollTop = display.scrollHeight;
}

// Actualizar lista de chats en el panel lateral
function updateChatList() {
  chatList.innerHTML = '';
  Object.keys(chats).forEach(chat => {
    const chatItem = document.createElement("li");
    chatItem.textContent = chat;
    chatItem.className = chat === activeChat ? "chat-item active" : "chat-item";
    chatItem.onclick = () => {
      activeChat = chat;
      updateChatList();
      renderMessages();
    };
    chatList.appendChild(chatItem);
  });
}

// recibe el nickname asignado por el servidor y lo muestra en pantalla
socket.on("nickname", (nick) => {
  myName = nick;
  nicknameDisplay.textContent = nick;
});

// recibe un mensaje general y lo agrega al chat general
socket.on("message", (msg) => {
  addMessage("General", msg);
  updateChatList();
  notifSound.play();
});

// recibe un mensaje privado y lo agrega en el chat correspondiente
socket.on("privateMessage", ({ from, to, text }) => {
  const other = from === myName ? to : from;
  const formatted = from === myName
    ? `📤 Tú → @${to}: ${text}`
    : `📩 @${from}: ${text}`;
  addMessage(other, formatted);
  updateChatList();
  notifSound.play();
});

// Indicador de escritura
socket.on("typing", ({ user, status }) => {
  typingIndicator.innerText = status && activeChat === "General" ? `${user} está escribiendo...` : '';
});

// Actualiza la lista de usuarios conectados en el panel lateral
socket.on("userList", (users) => {
  userList.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement("li");
    li.textContent = user;
    userList.appendChild(li);
  });
});

// Maneja el envío del formulario de mensaje, envía el mensaje al servidor y resetea el campo
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = msgEntry.value.trim();
  if (msg) {
    // Si estamos en General, enviar mensaje público
    if (activeChat === 'General') {
      socket.send(msg);
    } else {
      // Enviar como DM: se construye el comando automáticamente
      socket.send(`/dm ${activeChat} ${msg}`);
    }
    msgEntry.value = "";
    msgEntry.style.height = "auto";
    socket.emit("typing", false);
  }
});

// Detecta cuando el usuario comienza o deja de escribir para notificar al servidor
msgEntry.addEventListener("input", () => {
  if (!typing) {
    typing = true;
    socket.emit("typing", true);
  }
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    typing = false;
    socket.emit("typing", false);
  }, 1000);

  msgEntry.style.height = "auto";
  msgEntry.style.height = msgEntry.scrollHeight + "px";
});

updateChatList();
renderMessages();
