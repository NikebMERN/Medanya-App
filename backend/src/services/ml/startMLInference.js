// Spawns ML inference service (uvicorn) so it runs with npm start
const { spawn } = require("child_process");
const path = require("path");
const logger = require("../../utils/logger.util");

const ML_PORT = process.env.ML_INFERENCE_PORT || process.env.ML_PORT || 8000;
const ML_HOST = process.env.ML_INFERENCE_HOST || "127.0.0.1";
const ML_START_INFERENCE = process.env.ML_START_INFERENCE !== "false";

let mlProcess = null;

function startMLInference() {
    if (!ML_START_INFERENCE) {
        logger.info("ML inference: auto-start disabled (ML_START_INFERENCE=false)");
        return null;
    }
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const args = [
        "-m",
        "uvicorn",
        "ml.service:app",
        "--host",
        ML_HOST,
        "--port",
        String(ML_PORT),
    ];
    const cwd = process.cwd();
    const mlDir = path.join(cwd, "ml");
    try {
        mlProcess = spawn(pythonCmd, args, {
            cwd,
            stdio: ["ignore", "pipe", "pipe"],
            env: { ...process.env, PYTHONPATH: cwd },
        });
        mlProcess.stdout?.on("data", (d) => logger.info(`[ML] ${String(d).trim()}`));
        mlProcess.stderr?.on("data", (d) => logger.warn(`[ML] ${String(d).trim()}`));
        mlProcess.on("error", (err) => logger.error("ML inference spawn error", err.message));
        mlProcess.on("exit", (code) => {
            if (code !== 0 && code !== null) logger.warn(`ML inference exited with code ${code}`);
            mlProcess = null;
        });
        logger.info(`ML inference started on http://${ML_HOST}:${ML_PORT}`);
        return mlProcess;
    } catch (e) {
        logger.warn("ML inference: could not start (uvicorn not installed?)", e.message);
        return null;
    }
}

function stopMLInference() {
    if (mlProcess) {
        mlProcess.kill("SIGTERM");
        mlProcess = null;
        logger.info("ML inference stopped");
    }
}

module.exports = { startMLInference, stopMLInference };
