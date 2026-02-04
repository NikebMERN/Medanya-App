const express = require("express");
const router = express.Router();
const authRoutes = require("./modules/auth/auth.routes");
const authMiddleware = require("./middlewares/auth.middleware");
const adminRoutes = require("./modules/admin/admin.routes");

router.use("/auth", authRoutes);

// STEP 4: Mount admin routes under /admin
router.use("/admin", adminRoutes);

router.get("/protected", authMiddleware, (req, res) => {
    res.json({
        message: "Protected access granted",
        user: req.user,
    });
});

module.exports = router;
