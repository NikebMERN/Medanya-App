/**
 * Sets EXPO_PUBLIC_API_URL and EXPO_PUBLIC_SOCKET_URL to your machine's local IP
 * so the app can reach the backend when running on a device or emulator.
 * Run before `expo start` or use `npm start` which runs this automatically.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

const ENV_PATH = path.join(__dirname, "..", ".env");
const DEFAULT_PORT = 4001;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

function getPortFromEnv(content) {
  const match = content.match(/EXPO_PUBLIC_API_URL=(.+)/);
  if (!match) return DEFAULT_PORT;
  const url = (match[1] || "").trim();
  const portMatch = url.match(/:(\d+)(?:\/|$)/);
  return portMatch ? portMatch[1] : DEFAULT_PORT;
}

function updateEnv(ip) {
  let content = "";
  if (fs.existsSync(ENV_PATH)) {
    content = fs.readFileSync(ENV_PATH, "utf8");
  }

  const portNum = getPortFromEnv(content);
  const base = `http://${ip}:${portNum}`;
  const newApiUrl = `EXPO_PUBLIC_API_URL=${base}`;
  const newSocketUrl = `EXPO_PUBLIC_SOCKET_URL=${base}`;

  const lines = content.split("\n");
  const out = [];
  let hadApi = false;
  let hadSocket = false;

  for (const line of lines) {
    if (/^\s*EXPO_PUBLIC_API_URL\s*=/.test(line)) {
      out.push(newApiUrl);
      hadApi = true;
      continue;
    }
    if (/^\s*EXPO_PUBLIC_SOCKET_URL\s*=/.test(line)) {
      out.push(newSocketUrl);
      hadSocket = true;
      continue;
    }
    out.push(line);
  }

  if (!hadApi) out.push(newApiUrl);
  if (!hadSocket) out.push(newSocketUrl);

  fs.writeFileSync(ENV_PATH, out.join("\n").trimEnd() + "\n", "utf8");
  return base;
}

function main() {
  const ip = getLocalIP();
  if (!ip) {
    console.warn("Could not detect local IP; leaving .env unchanged. Set EXPO_PUBLIC_API_URL manually.");
    process.exit(0);
    return;
  }

  const base = updateEnv(ip);
  console.log("API URL set to your local IP:", base);
}

main();
