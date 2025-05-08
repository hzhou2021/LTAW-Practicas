const { ipcRenderer } = require('electron');

const nodeVersionEl = document.getElementById("node-version");
const electronVersionEl = document.getElementById("electron-version");
const chromeVersionEl = document.getElementById("chrome-version");
const connectionUrlEl = document.getElementById("connection-url");
const archEl = document.getElementById("arch");
const platformEl = document.getElementById("platform");
const cwdEl = document.getElementById("cwd");
const testBtn = document.getElementById("test-btn");
const messagesContainer = document.getElementById("messages");

// Escuchar información enviada por el proceso principal
ipcRenderer.on('server-info', (event, data) => {
  nodeVersionEl.textContent = data.versions.node;
  electronVersionEl.textContent = data.versions.electron;
  chromeVersionEl.textContent = data.versions.chrome;

  const url = `http://${data.ip}:${data.port}`;
  connectionUrlEl.textContent = url;
});

// Mostrar información del sistema directamente desde Node.js
archEl.textContent = process.arch;
platformEl.textContent = process.platform;
cwdEl.textContent = process.cwd();

// Enviar mensaje de prueba
testBtn.addEventListener('click', () => {
  ipcRenderer.send('send-test-message', "📣 Mensaje de prueba desde la GUI");
  addMessageToLog("📤 Mensaje de prueba enviado desde la GUI");
});

// Mostrar mensajes en el log
function addMessageToLog(text) {
  const div = document.createElement('div');
  div.textContent = text;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
