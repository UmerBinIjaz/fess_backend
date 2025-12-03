require('dotenv').config(); // Load environment variables from .env file
const jwt = require('jsonwebtoken');

const authenticateAdmin = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Get the token from the "Authorization" header

  if (!token) {
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }

  try {
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use the secret from the environment variable
    req.admin = decoded.adminId; // Attach the admin ID to the request object
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authenticateAdmin;