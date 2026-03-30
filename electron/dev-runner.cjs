const { spawn } = require("child_process");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const electronBin = path.join(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "electron.cmd" : "electron",
);
const port = process.env.PORT || "3000";
const host = "127.0.0.1";
const startUrl = `http://${host}:${port}`;
const electronEnv = {
  ...process.env,
  ELECTRON_RENDERER_URL: startUrl,
};

delete electronEnv.ELECTRON_RUN_AS_NODE;

const childProcesses = [];

function stopChildren() {
  while (childProcesses.length > 0) {
    const child = childProcesses.pop();
    if (child && !child.killed) {
      child.kill();
    }
  }
}

process.on("SIGINT", () => {
  stopChildren();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopChildren();
  process.exit(0);
});

const nextProcess = spawn(process.execPath, [nextBin, "dev", "-H", host, "-p", port], {
  cwd: projectRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    HOSTNAME: host,
    PORT: port,
  },
});
childProcesses.push(nextProcess);

const electronProcess = spawn(electronBin, [".", "--no-sandbox"], {
  cwd: projectRoot,
  stdio: "inherit",
  env: electronEnv,
});
childProcesses.push(electronProcess);

electronProcess.on("exit", (code) => {
  stopChildren();
  process.exit(code ?? 0);
});

nextProcess.on("exit", (code) => {
  if (!electronProcess.killed) {
    electronProcess.kill();
  }
  process.exit(code ?? 0);
});
