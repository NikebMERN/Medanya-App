const service = require("./superlike.service");

function sendErr(res, err) {
  const code = err.code || "SERVER_ERROR";
  const status =
    code === "UNAUTHORIZED" ? 401 :
    code === "FORBIDDEN" ? 403 :
    code === "NOT_FOUND" ? 404 :
    code === "VALIDATION_ERROR" || code === "ALREADY_CLAIMED" ? 400 :
    code === "INSUFFICIENT_SUPERLIKES" || code === "DAILY_LIMIT" || code === "STREAM_NOT_LIVE" ? 409 : 500;
  return res.status(status).json({ error: { code, message: err.message || code } });
}

const getBalance = async (req, res) => {
  try {
    const balance = await service.getBalance(req.user);
    return res.json({ success: true, balance });
  } catch (e) {
    return sendErr(res, e);
  }
};

const earnWelcome = async (req, res) => {
  try {
    const data = await service.earnWelcome(req.user);
    return res.json({ success: true, ...data });
  } catch (e) {
    return sendErr(res, e);
  }
};

const earnAd = async (req, res) => {
  try {
    const data = await service.earnAd(req.user);
    return res.json({ success: true, ...data });
  } catch (e) {
    return sendErr(res, e);
  }
};

const earnReferral = async (req, res) => {
  try {
    const data = await service.earnReferral(req.user, req.body);
    return res.json({ success: true, ...data });
  } catch (e) {
    return sendErr(res, e);
  }
};

const superlikeVideo = async (req, res) => {
  try {
    const data = await service.spendOnVideo(req.user, req.params.id);
    return res.json({ success: true, ...data });
  } catch (e) {
    return sendErr(res, e);
  }
};

const superlikeStream = async (req, res) => {
  try {
    const data = await service.spendOnLive(req.user, req.params.id);
    return res.json({ success: true, ...data });
  } catch (e) {
    return sendErr(res, e);
  }
};

const getCreatorEarnings = async (req, res) => {
  try {
    const data = await service.getCreatorEarningsMonthly(req.user, req.query);
    return res.json({ success: true, earnings: data });
  } catch (e) {
    return sendErr(res, e);
  }
};

module.exports = {
  getBalance,
  earnWelcome,
  earnAd,
  earnReferral,
  superlikeVideo,
  superlikeStream,
  getCreatorEarnings,
};
