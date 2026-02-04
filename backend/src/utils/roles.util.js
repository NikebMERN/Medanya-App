// src/utils/roles.util.js
const ROLES = Object.freeze({
    USER: "user",
    MODERATOR: "moderator",
    ADMIN: "admin",
});

const ALLOWED_ROLES = Object.freeze([ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN]);

module.exports = { ROLES, ALLOWED_ROLES };
