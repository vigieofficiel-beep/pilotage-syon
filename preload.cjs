const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  publishPost: (platform, contenu) => ipcRenderer.invoke('publish-post', { platform, contenu })
})
