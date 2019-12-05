const functions = require("firebase-functions");
const admin = require("firebase-admin");

const app = require("express")();
// const express = require("express");
// const app = express();

admin.initializeApp(); //khởi tạo firebase

const config = {
  apiKey: "AIzaSyD3DOlfr4xt_GZx-tBeVrLJ4-mIFe8rkiI",
  authDomain: "socialape-12h.firebaseapp.com",
  databaseURL: "https://socialape-12h.firebaseio.com",
  projectId: "socialape-12h",
  storageBucket: "socialape-12h.appspot.com",
  messagingSenderId: "575302739540",
  appId: "1:575302739540:web:19cf1bdb7a3bcf1fa52fc1",
  measurementId: "G-1LJ4H5RB8T"
};

const firebase = require("firebase");
firebase.initializeApp(config);

const db = admin.firestore();

app.get("/screams", (req, res) => {
  db.collection("screams")
    .orderBy("createAt", "desc") //sắp xếp theo createAt desc: giảm dần  - asc tăng dần
    .get()
    .then(data => {
      let screams = [];
      data.forEach(doc => {
        // get theo dạng object chỉ định
        screams.push({
          screamsID: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createAt: doc.data().createAt
        });
      });
      return res.json(screams);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: err.code });
    });
});

// exports.getScream = functions.https.onRequest((req, res) => {
//   admin
//     .firestore()
//     .collection("screams")
//     .get()
//     .then(data => {
//       let screams = [];
//       data.forEach(doc => {
//         screams.push(doc.data());
//       });
//       return res.json(screams);
//     })
//     .catch(err => console.log(err));
// });

// check đăng nhập tk (nếu đăng nhập rồi thì mới cho phép thêm dữ liệu) - middleware
const FBAuth = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    //kiểm tra headers có tồn tại authorization và có chứa "Bearer "
    idToken = req.headers.authorization.split("Bearer ")[1];
    //tách string thành hai và lấy phần tử index=1 (token)
  } else {
    console.error("No token found");
    return res.status(403).json({ error: "Unauthorization" });
  }

  //kiểm tra token có phải là token của tài khoản chứ kp token bất kỳ đc thêm vào
  admin
    .auth()
    .verifyIdToken(idToken) // kiểm tra idToken lấy được với token auth của user
    .then(decodedToken => {
      req.user = decodedToken;
      console.log(decodedToken);
      return db
        .collection("users")
        .where("userId", "==", req.user.uid)
        .limit(1) // chỉ lấy 1 doc
        .get();
    })
    .then(data => {
      req.user.handle = data.docs[0].data().handle; //lấy giá trị handle đầu tiên trong mảng docs
      return next();
    })
    .catch(err => {
      console.error("Error while verifying token", err);
      return res.status(403).json(err);
    });
};

app.post("/scream", FBAuth, (req, res) => {
  if (req.method !== "POST") {
    return res.status(400).json({ error: "Method not allowed" });
  }

  const newScream = {
    body: req.body.body,
    // userHandle: req.body.userHandle,
    userHandle: req.user.handle,
    // createAt: admin.firestore.Timestamp.fromDate(new Date())
    createAt: new Date().toISOString() //toISOString return ngày tháng theo kiểu đơn giản
  };
  db.collection("screams")
    .add(newScream)
    .then(doc => {
      res.json({ message: `document ${doc.id} created succesfuly` });
    })
    .catch(err => {
      res.status(500).json({ error: "something went wrong" });
      console.error(err);
    });
});

// kiểm tra empty
const isEmpty = string => {
  if (string.trim() === "") return true;
  else return false;
};

// kiểm tra email hợp lệ
const isEmail = email => {
  // const regEx = /^[a-z][a-z0-9_\.]{5,32}@[a-z0-9]{2,}(\.[a-z0-9]{2,4}){1,2}$/gm
  const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regEx)) return true;
  else return false;
};

// SignUp route
app.post("/signup", (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  };

  let errors = {};
  // kiểm tra email nhập
  if (isEmpty(newUser.email)) {
    errors.email = "Email must not be empty";
  } else if (!isEmail(newUser.email)) {
    errors.email = "Must be a valid email address";
  }

  //kiểm tra password
  if (isEmpty(newUser.password)) errors.password = "Password must not Empty";
  if (newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = "Password must be  match";

  //kiểm tra handle
  if (isEmpty(newUser.handle)) errors.handle = "Handle must not Empty";

  //kiểm tra object error có tồn tại
  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  // TODO: validate data
  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      //Kiểm tra tài khoản đã tồn tại hay chưa và tạo tài khoản
      if (doc.exists) {
        return res.status(400).json({ handle: "this handle is already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then(data => {
      //lấy token từ tài khoản vừa tạo
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idToken => {
      token = idToken;
      //   return res.status(201).json({ token });
      const userCredentials = {
        //dự liệu lấy để lưu vào db
        handle: newUser.handle,
        email: newUser.email,
        createAt: new Date().toISOString(),
        userId
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials); //tạo user trong db
    })
    .then(() => {
      return res.status(201).json({ token }); // trả về token
    })
    .catch(err => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already is use" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });

  //   firebase
  //     .auth()
  //     .createUserWithEmailAndPassword(newUser.email, newUser.password)
  //     .then(data => {
  //       return res
  //         .status(201)
  //         .json({ message: `user ${data.user.uid} signed up succesfully` });
  //     })
  //     .catch(err => {
  //       console.error(err);
  //       return res.status(500).json({ error: err.code });
  //     });
});

app.post("/login", (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };
  let errors = {};
  // check input email
  if (isEmpty(user.email)) errors.email = "Must not be empty";
  if (isEmpty(user.password)) errors.password = "Must not be empty";

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);
  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      //kiểm tra email,password đúng thì lấy token
      return data.user.getIdToken();
    })
    .then(token => {
      // trả về token
      return res.json({ token });
    })
    .catch(err => {
      console.error(err);
      //check mật khẩu và user
      if (err.code === "auth/wrong-password") {
        return res
          .status(403)
          .json({ general: "wrong password, please try again" });
      } else if (err.code === "auth/user-not-found") {
        return res.status(403).json({ user: "user did not exist" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
});

// exports.api = functions.region('europe-west1').https.onRequest(app); thay đổi server region để tăng tốc độ kết phản hồi request
exports.api = functions.https.onRequest(app);
