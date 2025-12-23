const express = require('express');
const Database = require('./database');

const router = express.Router();
const db = new Database();

const requireAuth = async (req, res, next) => {
  try {
    // Check if request has TinyAuth session cookie
    const cookies = req.headers.cookie;
    const hasAuthCookie = cookies && cookies.includes('tinyauth-session');
    
    if (!hasAuthCookie) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get user info from TinyAuth headers
    const userEmail = req.headers['remote-email'];
    const userName = req.headers['remote-name'];
    const remoteUser = req.headers['remote-user'];
    
    if (!userEmail) {
      return res.status(401).json({ error: 'No user email in headers' });
    }
    
    // Get or create user in database
    let user = await db.getUserByEmail(userEmail);
    if (!user) {
      const userId = Date.now().toString();
      user = await db.createUser(userId, userEmail, 'free');
    }
    
    // Add name from headers to user object
    req.user = { ...user, name: userName };
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = router;
module.exports.requireAuth = requireAuth;