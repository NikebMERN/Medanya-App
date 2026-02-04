var admin = require("firebase-admin");

var serviceAccount = require("../medanya-project-firebase-adminsdk-fbsvc-306d1999c9.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;