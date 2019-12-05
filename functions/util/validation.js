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

exports.validateSignupData = data => {
  let errors = {};
  // kiểm tra email nhập
  if (isEmpty(data.email)) {
    errors.email = "Email must not be empty";
  } else if (!isEmail(data.email)) {
    errors.email = "Must be a valid email address";
  }

  //kiểm tra password
  if (isEmpty(data.password)) errors.password = "Password must not Empty";
  if (data.password !== data.confirmPassword)
    errors.confirmPassword = "Password must be  match";

  //kiểm tra handle
  if (isEmpty(data.handle)) errors.handle = "Handle must not Empty";

  //kiểm tra object error có tồn tại
  //   if (Object.keys(errors).length > 0) return res.status(400).json(errors);
  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.validateLoginData = data => {
  let errors = {};
  // check input email
  if (isEmpty(data.email)) errors.email = "Must not be empty";
  if (isEmpty(data.password)) errors.password = "Must not be empty";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};
