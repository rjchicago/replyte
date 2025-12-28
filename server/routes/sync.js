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

  router.post('/usage', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }
      
      const user = await db.getUserByApiKey(apiKey);
      if (!user) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      const { templateId, xUserHandle } = req.body;
      
      if (templateId) {
        await db.logUsage(user.id, templateId, xUserHandle);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error logging usage:', error);
      res.status(500).json({ error: 'Failed to log usage' });
    }
  });

  router.get('/usage', async (req, res) => {
    try {
      let apiKey = req.headers['x-api-key'] || req.query.key;
      
      // Decode base64 if needed
      if (apiKey && !apiKey.startsWith('rpl_')) {
        try {
          apiKey = atob(apiKey);
        } catch (e) {
          // If decode fails, use as-is
        }
      }
      
      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }
      
      const user = await db.getUserByApiKey(apiKey);
      if (!user) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      const { templateId, xUserHandle } = req.query;
      
      if (templateId) {
        await db.logUsage(user.id, templateId, xUserHandle);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error logging usage:', error);
      res.status(500).json({ error: 'Failed to log usage' });
    }
  });

  return router;
};