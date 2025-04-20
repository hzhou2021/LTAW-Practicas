const socket = io();

let myName = '';
let myId = '';
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
    let label;
    if (chat === 'General') {
      label = 'General';
    } else {
      const info = chats[chat].meta;
      if (info) {
        // Mostrar solo el nombre del otro usuario
        label = info.other;
      } else {
        label = chat;
      }
    }
    chatItem.textContent = label;
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
  myId = socket.id;
});

// recibe un mensaje general y lo agrega al chat general
socket.on("message", (msg) => {
  addMessage("General", msg);
  updateChatList();
  notifSound.play();
});

// Recibe un mensaje privado y lo guarda/visualiza en un único canal compartido entre ambos usuarios
socket.on("privateMessage", ({ from, fromId, to, toId, text }) => {
  const chatId = [fromId, toId].sort().join('↔');
  const formatted = from === myName
    ? `📤 Tú → @${to}: ${text}`
    : `📩 @${from}: ${text}`;

  addMessage(chatId, formatted);

  if (!chats[chatId].meta) {
    const otherName = from === myName ? to : from;
    chats[chatId].meta = {
      other: otherName
    };
  }

  if (activeChat !== chatId) {
    activeChat = chatId;
    updateChatList();
    renderMessages();
  }

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

// Enviar mensajes desde el formulario
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = msgEntry.value.trim();
  if (msg) {
    if (activeChat === 'General') {
      socket.send(msg);
    } else {
      const recipientName = chats[activeChat].meta?.other;
      socket.send(`/dm ${recipientName} ${msg}`);
    }

    msgEntry.value = "";
    msgEntry.style.height = "auto";
    socket.emit("typing", false);
  }
});

// Permitir envío con Enter (sin Shift)
msgEntry.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();           // Evita salto de línea con Shift + Enter
    chatForm.requestSubmit();     // Envía el formulario
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