const path = require('node:path');
const { app, BrowserWindow } = require('electron');
const { AppRuntime } = require('../src/main/runtime/AppRuntime');
const { registerAppHandlers } = require('../src/main/ipc/registerHandlers');

let mainWindow = null;
let runtime = null;

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1540,
    height: 960,
    minWidth: 1260,
    minHeight: 760,
    backgroundColor: '#202020',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  await mainWindow.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'));
}

async function bootstrap() {
  runtime = new AppRuntime({
    rootDir: path.join(__dirname, '..'),
    dataDir: app.getPath('userData')
  });

  await runtime.start();
  registerAppHandlers(runtime);
  await createMainWindow();
}

app.whenReady().then(bootstrap).catch((error) => {
  console.error('Failed to start Decksmith:', error);
  app.exit(1);
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});

app.on('before-quit', () => {
  runtime?.dispose().catch((error) => {
    console.error('Failed to dispose runtime cleanly:', error);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
