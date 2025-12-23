const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Serve static React build files
app.use(express.static(path.join(__dirname, 'build')));

// Debug endpoint to see headers from TinyAuth
app.get('/debug/headers', (req, res) => {
  res.json({
    headers: req.headers,
    remoteUser: req.headers['remote-user'],
    remoteEmail: req.headers['remote-email'],
    remoteName: req.headers['remote-name']
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Web server running on port ${PORT}`);
});