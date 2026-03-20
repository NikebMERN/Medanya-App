/**
 * Postinstall hook for EAS + local:
 * - Run patch-package (best-effort; never block builds)
 * - Pin Android Gradle Plugin (AGP) version for RN 0.81 compatibility
 */
const { spawnSync } = require("child_process");

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: false, ...opts });
  return res.status === 0;
}

// 1) patch-package (best-effort)
try {
  // Use npx to ensure we run the local binary
  run("npx", ["patch-package"], { cwd: process.cwd() });
} catch (e) {
  // ignore
}

// 2) patch AGP pin (must run)
try {
  run("node", ["scripts/patch-agp.js"], { cwd: process.cwd() });
} catch (e) {
  // If this fails, native build will likely break; rethrow so it's visible.
  throw e;
}

