const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { startChatServer, sendTestMessage, getServerInfo } = require('./chatServer');

let mainWindow = null;

app.whenReady().then(() => {
  console.log("🟢 Electron listo. Lanzando servidor y GUI...");

  // Iniciar el servidor de chat
  const serverInfo = startChatServer();

  // Crear ventana principal
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,     
      contextIsolation: false     
    }
  });

  // Cargar la interfaz HTML del panel de administración
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Enviar información inicial al proceso de renderizado una vez esté lista la ventana
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('server-info', {
      ...serverInfo,
      versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
      }
    });
  });
});

ipcMain.on('send-test-message', (event, msg) => {
  sendTestMessage(msg || "📢 Este es un mensaje de prueba desde el servidor Electron");
});
