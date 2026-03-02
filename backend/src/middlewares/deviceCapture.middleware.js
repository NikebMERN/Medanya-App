/**
 * Capture device_id and IP for device fingerprinting.
 * Expects X-Device-ID header or body.device_id from client.
 */
const userDevicesDb = require("../modules/trust/userDevices.mysql");
const trustScoreService = require("../services/trustScore.service");

function getClientIp(req) {
    return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.headers["x-real-ip"] ||
        req.socket?.remoteAddress ||
        req.connection?.remoteAddress ||
        null;
}

function getDeviceId(req) {
    return req.headers["x-device-id"] ||
        req.body?.device_id ||
        req.query?.device_id ||
        "unknown";
}

async function captureDevice(userId, req) {
    const deviceId = getDeviceId(req);
    const ipAddress = getClientIp(req);
    if (!userId) return;
    try {
        await userDevicesDb.insertDevice({ userId, deviceId, ipAddress });
    } catch (e) {
        // insert failed — silent
    }
}

async function checkDeviceRisk(deviceId, ipAddress) {
    const deviceAccounts = await userDevicesDb.countAccountsByDeviceId(deviceId);
    const ipAccounts = ipAddress ? await userDevicesDb.countAccountsByIp(ipAddress) : 0;
    const bannedDevice = await userDevicesDb.deviceUsedByBannedUser(deviceId);
    let risk = 0;
    if (deviceAccounts > 3) risk += 2;
    if (ipAccounts > 3) risk += 1;
    if (bannedDevice) risk += 3;
    return { deviceAccounts, ipAccounts, bannedDevice, risk };
}

module.exports = { captureDevice, getClientIp, getDeviceId, checkDeviceRisk };
