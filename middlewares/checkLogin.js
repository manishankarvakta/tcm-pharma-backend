const jwt = require("jsonwebtoken");

const checklogin = (req, res, next) => {
  const { authorization } = req.headers;
  try {
    const token = authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { username, id, type, aamarId, warehouse } = decoded;
    req.username = username;
    req.userId = id;
    req.type = type;
    req.user = {
      _id: id,
      username,
      type,
      aamarId,
      warehouse,
    };
    next();
  } catch (err) {
    console.log("CheckLogin Error:", err.message);
    // console.log("Token caused error:", req.headers.authorization);
    next("Authentication Failure!");
  }
};

module.exports = checklogin;
