const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openHelpWindow: (helpId) => ipcRenderer.invoke('open-help-window', helpId),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getEnvPath: () => ipcRenderer.invoke('get-env-path'),
});
