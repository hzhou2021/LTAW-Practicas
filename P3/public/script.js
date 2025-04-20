const socket = io();

const display = document.getElementById("display");
const msgEntry = document.getElementById("msg_entry");
const chatForm = document.getElementById("chat-form");
const typingIndicator = document.getElementById("typing");
const nicknameDisplay = document.getElementById("nickname");
const userList = document.getElementById("user-list");
const notifSound = document.getElementById("notif-sound");

let typing = false;
let typingTimeout;

// Recibir mensajes
socket.on("message", (msg) => {
  const msgElem = document.createElement("div");
  msgElem.classList.add("message");
  msgElem.textContent = msg;
  display.appendChild(msgElem);
  display.scrollTop = display.scrollHeight;
  notifSound.play();
});

// Recibir lista de usuarios conectados
socket.on("userList", (users) => {
  userList.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement("li");
    li.textContent = user;
    userList.appendChild(li);
  });

  // Actualizar nickname local (opcional, según cómo manejes el nick en cliente)
  const lastUser = users[users.length - 1];
  nicknameDisplay.textContent = lastUser;
});

// Indicador de escritura
socket.on("typing", ({ user, status }) => {
  typingIndicator.innerText = status ? `${user} está escribiendo...` : '';
});

// Enviar mensajes
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = msgEntry.value.trim();
  if (msg) {
    socket.send(msg);
    msgEntry.value = "";
    msgEntry.style.height = "auto";
    socket.emit("typing", false);
  }
});

// Detectar escritura
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

  // Auto-ajustar altura del campo de texto
  msgEntry.style.height = "auto";
  msgEntry.style.height = msgEntry.scrollHeight + "px";
});
