const functions = require("firebase-functions");
const app = require("express")();

const FBAuth = require("./util/FBAuth");
const { getAllScreams, postOneScream } = require("./handlers/screams");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser
} = require("./handlers/users");

// Scream route
app.get("/screams", getAllScreams);
app.post("/scream", FBAuth, postOneScream);

// users route
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);

// exports.api = functions.region('europe-west1').https.onRequest(app); thay đổi server region để tăng tốc độ kết phản hồi request
exports.api = functions.https.onRequest(app);
