/**
 * Postinstall hook for EAS + local:
 * - Run patch-package (best-effort; never block builds)
 * - Pin Android Gradle Plugin (AGP) version for RN 0.81 compatibility
 */
const { spawnSync } = require("child_process");

function run(cmd, args, opts = {}) {
  console.log(`[postinstall] Running: ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: false, ...opts });
  return res.status === 0;
}

// 1) patch-package (best-effort)
try {
  // Use npx to ensure we run the local binary
  const ok = run("npx", ["patch-package"], { cwd: process.cwd() });
  if (!ok) console.warn("[postinstall] patch-package failed (best-effort).");
} catch (e) {
  // ignore
}

// 2) patch AGP pin (must run)
try {
  const ok = run("node", ["scripts/patch-agp.js"], { cwd: process.cwd() });
  if (!ok) console.warn("[postinstall] patch-agp.js failed.");
} catch (e) {
  // If this fails, native build will likely break; rethrow so it's visible.
  throw e;
}

