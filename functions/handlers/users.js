const { admin, db } = require("../util/admin");
const config = require("../util/config");
const firebase = require("firebase");
const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails
} = require("../util/validation");

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
  const noImg = "no-img.png";

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
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
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

//add user details
exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);

  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: "Details added successfully" });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// get user details
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.handle}`)
    .get()
    .then(doc => {
      // kiểm tra nếu user đã tồn tại detail thì tạo collection mới
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("likes")
          .where("userHandle", "==", req.user.handle)
          .get();
      }
    })
    .then(data => {
      userData.likes = [];
      data.forEach(doc => {
        userData.likes.push(doc.data());
      });
      return res.json(userData);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.error });
    });
};

// upload profile image
exports.uploadImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    // kiểm tra kiểu file được tải lên
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: " Wrong file type submitted" });
    }
    //image.png
    const imageExtenstion = filename.split(".")[filename.split(".").length - 1]; //tách đuôi ảnh
    imageFileName = `${Math.round(
      //đặt tên cho image user tải lên
      Math.random() * 1000000000000
    )}.${imageExtenstion}`;

    const filepath = path.join(os.tmpdir(), imageFileName); //tạo đường dẫn cho file ảnh được tải lên
    imageToBeUploaded = { filepath, mimetype }; //đường dẫn(path) và mimetype vào obj imageToBeUploaded
    file.pipe(fs.createWriteStream(filepath)); //tạo file sử dụng fs libraly
  });

  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype
          }
        }
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: "image uploaded successfully" });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: "something went wrong" });
      });
  });
  busboy.end(req.rawBody);
};
