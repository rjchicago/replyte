require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('./database');
const auth = require('./auth');
const apiRoutes = require('./routes/api');
const syncRoutes = require('./routes/sync');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://replyte.localtest.me', /^chrome-extension:\/\//],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
const db = new Database();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/auth', auth);

// API routes (with TinyAuth)
app.use('/api', apiRoutes(db));

// Sync routes (with API key auth)
app.use('/sync', syncRoutes(db));

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;