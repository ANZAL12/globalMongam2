const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    send: (channel, data) => {
      // whitelist channels
      let validChannels = ['toMain'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    receive: (channel, func) => {
      let validChannels = ['fromMain'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    // Cloudinary bridge
    cloudinary: {
      listAssets: (options) => ipcRenderer.invoke('cloudinary:listAssets', options),
      deleteAssets: (publicIds) => ipcRenderer.invoke('cloudinary:deleteAssets', publicIds),
      deleteByDate: (dateRange) => ipcRenderer.invoke('cloudinary:deleteByDate', dateRange),
      deleteAll: () => ipcRenderer.invoke('cloudinary:deleteAll'),
      getUsage: () => ipcRenderer.invoke('cloudinary:getUsage')
    }
  }
);
