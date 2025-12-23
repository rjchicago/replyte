require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Database = require('./database');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer();

app.use(cors({
  origin: 'https://replyte.localtest.me',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests without auth
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://replyte.localtest.me');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
const db = new Database();

// Auth routes
app.use('/auth', auth);

// API routes
app.get('/api/user/info', auth.requireAuth, (req, res) => {
  res.json({ 
    email: req.user.email,
    tier: req.user.tier || 'free'
  });
});

app.get('/api/user/limits', auth.requireAuth, (req, res) => {
  const limits = {
    free: 100,
    premium: 500,
    'premium+': Infinity
  };
  res.json({ 
    tier: req.user.tier || 'free',
    limit: limits[req.user.tier || 'free'],
    current: req.user.handleCount || 0
  });
});

// Chrome extension sync endpoints
app.get('/api/sync/data', auth.requireAuth, async (req, res) => {
  const [handles, templates] = await Promise.all([
    db.getHandles(req.user.id),
    db.getTemplates(req.user.id)
  ]);
  res.json({ handles, templates });
});

app.post('/api/sync/data', auth.requireAuth, async (req, res) => {
  try {
    const { handles, templates } = req.body;
    
    // Upsert handles
    if (handles?.length) {
      for (const handle of handles) {
        await db.upsertHandle(req.user.id, handle);
      }
    }
    
    // Upsert templates
    if (templates?.length) {
      for (const template of templates) {
        await db.upsertTemplate(req.user.id, template);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error syncing data:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

app.get('/api/handles', auth.requireAuth, async (req, res) => {
  const handles = await db.getHandles(req.user.id);
  res.json(handles);
});

app.post('/api/handles', auth.requireAuth, async (req, res) => {
  console.log('POST /api/handles - User:', req.user?.email);
  console.log('POST /api/handles - Body:', req.body);
  
  const { handle, nickname, emojis } = req.body;
  
  // Validate required fields
  if (!handle || !nickname) {
    return res.status(400).json({ error: 'Handle and nickname are required' });
  }
  
  const limits = { free: 1000, premium: 5000, 'premium+': Infinity };
  const userLimit = limits[req.user.tier || 'free'];
  const currentCount = await db.getHandleCount(req.user.id);
  
  console.log('Current handle count:', currentCount, 'Limit:', userLimit);
  
  if (currentCount >= userLimit) {
    return res.status(403).json({ error: 'Handle limit reached' });
  }
  
  const handleRecord = await db.upsertHandle(req.user.id, req.body);
  res.json(handleRecord);
});

app.delete('/api/handles/:id', auth.requireAuth, async (req, res) => {
  await db.db('handles').where({ id: req.params.id, user_id: req.user.id }).del();
  res.json({ success: true });
});

app.get('/api/handles/:id/delete', auth.requireAuth, async (req, res) => {
  await db.db('handles').where({ id: req.params.id, user_id: req.user.id }).del();
  res.json({ success: true });
});

app.post('/api/handles/:id', auth.requireAuth, async (req, res) => {
  const { handle, nickname, emojis } = req.body;
  const [updated] = await db.db('handles')
    .where({ id: req.params.id, user_id: req.user.id })
    .update({ handle, nickname, emojis })
    .returning('*');
  res.json(updated);
});

app.get('/api/templates', auth.requireAuth, async (req, res) => {
  const templates = await db.getTemplates(req.user.id);
  res.json(templates);
});

app.post('/api/templates', auth.requireAuth, async (req, res) => {
  try {
    const template = await db.upsertTemplate(req.user.id, req.body);
    if (template) {
      res.json(template);
    } else {
      res.status(400).json({ error: 'Failed to create template' });
    }
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/templates/:id/delete', auth.requireAuth, async (req, res) => {
  await db.db('templates').where({ id: req.params.id, user_id: req.user.id }).del();
  res.json({ success: true });
});

app.post('/api/templates/:id', auth.requireAuth, async (req, res) => {
  const { title, body, favorite } = req.body;
  const [updated] = await db.db('templates')
    .where({ id: req.params.id, user_id: req.user.id })
    .update({ name: title, content: body, favorite })
    .returning('*');
  res.json(updated);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});