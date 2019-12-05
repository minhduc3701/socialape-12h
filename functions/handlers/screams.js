const { db } = require("../util/admin");

// get all scream
exports.getAllScreams = (req, res) => {
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
};

// post scream
exports.postOneScream = (req, res) => {
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
};
