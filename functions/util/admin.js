const admin = require("firebase-admin");
admin.initializeApp(); //khởi tạo firebase
const db = admin.firestore();

module.exports = { admin, db };
