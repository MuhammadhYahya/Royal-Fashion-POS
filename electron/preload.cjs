const { contextBridge } = require("electron/renderer");

contextBridge.exposeInMainWorld("desktopMeta", {
  platform: process.platform,
});
