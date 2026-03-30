const { app, BrowserWindow, dialog, shell } = require("electron/main");
const fs = require("fs");
const http = require("http");
const net = require("net");
const next = require("next");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const desktopDataRoot = path.join(projectRoot, ".desktop-runtime");

let mainWindow = null;
let serverUrl = process.env.ELECTRON_RENDERER_URL || null;
let isQuitting = false;
let embeddedServer = null;
let nextApp = null;

fs.mkdirSync(path.join(desktopDataRoot, "userData"), { recursive: true });
fs.mkdirSync(path.join(desktopDataRoot, "sessionData"), { recursive: true });
fs.mkdirSync(path.join(desktopDataRoot, "crashDumps"), { recursive: true });

app.setPath("userData", path.join(desktopDataRoot, "userData"));
app.setPath("sessionData", path.join(desktopDataRoot, "sessionData"));
app.setPath("crashDumps", path.join(desktopDataRoot, "crashDumps"));

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to resolve a free port.")));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the server is reachable.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for the POS server at ${url}.`);
}

function closeEmbeddedServer() {
  if (!embeddedServer) {
    return;
  }

  const server = embeddedServer;
  embeddedServer = null;
  server.close();
}

async function startServerIfNeeded() {
  if (serverUrl) {
    return serverUrl;
  }

  const port = await getAvailablePort();
  serverUrl = `http://${host}:${port}`;

  nextApp = next({
    dev: false,
    dir: projectRoot,
    hostname: host,
    port,
  });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  embeddedServer = http.createServer((request, response) => {
    handle(request, response).catch((error) => {
      console.error("Embedded Next server request failed:", error);
      response.statusCode = 500;
      response.end("Internal Server Error");
    });
  });

  embeddedServer.on("error", (error) => {
    if (!isQuitting) {
      const message = error instanceof Error ? error.message : "Unknown server error.";
      dialog.showErrorBox("Royal Fashion", message);
      app.quit();
    }
  });

  await new Promise((resolve, reject) => {
    embeddedServer.listen(port, host, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  await waitForServer(serverUrl);
  return serverUrl;
}

async function createWindow() {
  const url = await startServerIfNeeded();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    autoHideMenuBar: true,
    title: "Bag Shop POS",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: "deny" };
  });

  await mainWindow.loadURL(url);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    try {
      await createWindow();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown startup error.";
      dialog.showErrorBox("Bag Shop POS", message);
      app.quit();
    }

    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", () => {
    isQuitting = true;
    closeEmbeddedServer();
  });
}
