// src/config/jwt.js
module.exports = {
    secret: process.env.JWT_SECRET,
    verifyOptions: {
        // add issuer/audience later if you enforce them in HTTP too
    },
};
