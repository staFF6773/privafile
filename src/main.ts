// main.ts
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { encryptFile, decryptFile } from './config/encryption';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  sendStatusToWindow('Update available. Downloading...');
});

autoUpdater.on('update-not-available', (info) => {
  sendStatusToWindow('Application is up to date.');
});

autoUpdater.on('error', (err) => {
  sendStatusToWindow('Error in auto-updater: ' + err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  sendStatusToWindow(
    `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`
  );
});

autoUpdater.on('update-downloaded', (info) => {
  sendStatusToWindow('Update downloaded. It will be installed on restart.');
  // Auto install after 5 seconds
  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 5000);
});

function sendStatusToWindow(text: string) {
  if (mainWindow) {
    mainWindow.webContents.send('update-message', text);
  }
}

// Handler to select a file
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
  });
  return result.filePaths[0];
});

// Handler to encrypt a file
ipcMain.handle('encrypt-file', async (event, filePath: string, password: string) => {
  return encryptFile(filePath, password);
});

// Handler to decrypt a file
ipcMain.handle('decrypt-file', async (event, filePath: string, password: string) => {
  return decryptFile(filePath, password);
});
