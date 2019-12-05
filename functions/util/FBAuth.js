const { admin, db } = require("./admin");

// check đăng nhập tk (nếu đăng nhập rồi thì mới cho phép thêm dữ liệu) - middleware

module.exports = (req, res, next) => {
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
