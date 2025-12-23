const express = require('express');

const router = express.Router();

module.exports = (db) => {
  // Test endpoint
  router.get('/test', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    const user = await db.getUserByApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    res.json({ 
      message: 'Authentication successful', 
      user: user.email,
      timestamp: new Date().toISOString() 
    });
  });

  // Data sync endpoints
  router.get('/data', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }
      
      const user = await db.getUserByApiKey(apiKey);
      if (!user) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      const [handles, templates] = await Promise.all([
        db.getHandles(user.id),
        db.getTemplates(user.id)
      ]);
      
      res.json({ handles, templates });
    } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({ error: 'Sync failed' });
    }
  });

  router.post('/data', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }
      
      const user = await db.getUserByApiKey(apiKey);
      if (!user) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      const { handles, templates } = req.body;
      
      // Upsert handles
      if (handles?.length) {
        for (const handle of handles) {
          await db.upsertHandle(user.id, handle);
        }
      }
      
      // Upsert templates
      if (templates?.length) {
        for (const template of templates) {
          await db.upsertTemplate(user.id, template);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error syncing data:', error);
      res.status(500).json({ error: 'Sync failed' });
    }
  });

  return router;
};