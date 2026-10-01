const jwt = require("jsonwebtoken");

const passHash = (req, res, next) => {
  const { password } = req.body;
  try {
    const token = authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { username, userId, type } = decoded;
    req.username = username;
    req.userId = userId;
    req.type = type;
    next();
  } catch {
    next("Authentication Failure!");
  }
};

module.exports = passHash;