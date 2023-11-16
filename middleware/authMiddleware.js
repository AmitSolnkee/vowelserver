const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  
  const token =
    req.headers.authorization && req.headers.authorization.split(" ")[1];
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Not authorized" }); // Handle token verification error
    }
  } else {
    return res.status(401).json({ error: "Token not available" }); // Handle missing token error
  }
};

module.exports = authMiddleware;
