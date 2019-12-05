const { db } = require("../util/admin");
const config = require("../util/config");
const firebase = require("firebase");
const { validateSignupData, validateLoginData } = require("../util/validation");

firebase.initializeApp(config);

// signup user
exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  };

  const { valid, errors } = validateSignupData(newUser);
  if (!valid) return res.status(400).json(errors);

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
};

// login user
exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };

  const { valid, errors } = validateLoginData(user);
  if (!valid) return res.status(400).json(errors);

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
};
