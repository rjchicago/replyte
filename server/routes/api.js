const express = require('express');
const auth = require('../auth');

const router = express.Router();

module.exports = (db) => {
  // User info
  router.get('/user/info', auth.requireAuth, (req, res) => {
    res.json({ 
      email: req.user.email,
      tier: req.user.tier || 'free',
      apiKey: req.user.api_key
    });
  });

  router.post('/user/generate-api-key', auth.requireAuth, async (req, res) => {
    try {
      const apiKey = await db.generateApiKey(req.user.id);
      res.json({ apiKey });
    } catch (error) {
      console.error('Failed to generate API key:', error);
      res.status(500).json({ error: 'Failed to generate API key' });
    }
  });

  router.get('/user/limits', auth.requireAuth, (req, res) => {
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

  // Handles
  router.get('/handles', auth.requireAuth, async (req, res) => {
    const handles = await db.getHandles(req.user.id);
    res.json(handles);
  });

  router.post('/handles', auth.requireAuth, async (req, res) => {
    const { handle, nickname, emojis } = req.body;
    
    if (!handle || !nickname) {
      return res.status(400).json({ error: 'Handle and nickname are required' });
    }
    
    const limits = { free: 1000, premium: 5000, 'premium+': Infinity };
    const userLimit = limits[req.user.tier || 'free'];
    const currentCount = await db.getHandleCount(req.user.id);
    
    if (currentCount >= userLimit) {
      return res.status(403).json({ error: 'Handle limit reached' });
    }
    
    const handleRecord = await db.upsertHandle(req.user.id, req.body);
    res.json(handleRecord);
  });

  router.delete('/handles/:id', auth.requireAuth, async (req, res) => {
    await db.db('handles').where({ id: req.params.id, user_id: req.user.id }).del();
    res.json({ success: true });
  });

  router.get('/handles/:id/delete', auth.requireAuth, async (req, res) => {
    await db.db('handles').where({ id: req.params.id, user_id: req.user.id }).del();
    res.json({ success: true });
  });

  router.post('/handles/:id', auth.requireAuth, async (req, res) => {
    const { handle, nickname, emojis } = req.body;
    const [updated] = await db.db('handles')
      .where({ id: req.params.id, user_id: req.user.id })
      .update({ handle, nickname, emojis })
      .returning('*');
    res.json(updated);
  });

  // Templates
  router.get('/templates', auth.requireAuth, async (req, res) => {
    const templates = await db.getTemplates(req.user.id);
    res.json(templates);
  });

  router.post('/templates', auth.requireAuth, async (req, res) => {
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

  router.get('/templates/:id/delete', auth.requireAuth, async (req, res) => {
    await db.db('templates').where({ id: req.params.id, user_id: req.user.id }).del();
    res.json({ success: true });
  });

  router.post('/templates/:id', auth.requireAuth, async (req, res) => {
    const { title, body, favorite } = req.body;
    const [updated] = await db.db('templates')
      .where({ id: req.params.id, user_id: req.user.id })
      .update({ name: title, content: body, favorite })
      .returning('*');
    res.json(updated);
  });

  // Usage reports
  router.get('/usage/report', auth.requireAuth, async (req, res) => {
    const { days = 7, groupBy = 'both' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    try {
      let query = db.db('usage_log')
        .where('usage_log.user_id', req.user.id)
        .where('usage_log.created_at', '>=', startDate);
      
      if (groupBy === 'nickname') {
        const results = await query
          .leftJoin('handles', function() {
            this.on('usage_log.x_user_handle', '=', 'handles.handle')
                .andOn('handles.user_id', '=', 'usage_log.user_id');
          })
          .select(
            db.db.raw('COALESCE(handles.nickname, usage_log.x_user_handle) as name'),
            'usage_log.x_user_handle as handle',
            db.db.raw('COUNT(*) as count')
          )
          .groupBy('handles.nickname', 'usage_log.x_user_handle')
          .orderBy('count', 'desc');
        res.json(results);
      } else if (groupBy === 'template') {
        const results = await query
          .join('templates', 'usage_log.template_id', 'templates.id')
          .select('templates.name as name', db.db.raw('COUNT(*) as count'))
          .groupBy('templates.id', 'templates.name')
          .orderBy('count', 'desc');
        res.json(results);
      } else {
        const results = await query
          .leftJoin('handles', function() {
            this.on('usage_log.x_user_handle', '=', 'handles.handle')
                .andOn('handles.user_id', '=', 'usage_log.user_id');
          })
          .join('templates', 'usage_log.template_id', 'templates.id')
          .select(
            db.db.raw('COALESCE(handles.nickname, usage_log.x_user_handle) as nickname'),
            'usage_log.x_user_handle as handle',
            'templates.name as template',
            db.db.raw('COUNT(*) as count')
          )
          .groupBy('handles.nickname', 'usage_log.x_user_handle', 'templates.id', 'templates.name')
          .orderBy('count', 'desc');
        res.json(results);
      }
    } catch (error) {
      console.error('Usage report error:', error);
      res.status(500).json({ error: 'Failed to generate usage report' });
    }
  });

  return router;
};