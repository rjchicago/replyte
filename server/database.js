const knex = require('knex');
const config = require('./knexfile');

class Database {
  constructor() {
    const env = process.env.NODE_ENV || 'development';
    this.db = knex(config[env]);
  }

  async createUser(id, email, tier = 'free') {
    const [user] = await this.db('users').insert({ id, email, tier }).returning('*');
    return user;
  }

  async getUserByEmail(email) {
    return await this.db('users').where({ email }).first();
  }

  async getUser(id) {
    return await this.db('users').where({ id }).first();
  }

  async getHandles(userId) {
    return await this.db('handles').where({ user_id: userId }).orderBy('handle', 'asc');
  }

  async getHandleCount(userId) {
    const result = await this.db('handles').where({ user_id: userId }).count('* as count');
    return parseInt(result[0].count);
  }

  async addHandle(userId, { handle, nickname, emojis }) {
    const [newHandle] = await this.db('handles')
      .insert({ user_id: userId, handle, nickname, emojis })
      .returning('*');
    return newHandle;
  }

  async getTemplates(userId) {
    const templates = await this.db('templates').where({ user_id: userId });
    return templates.map(t => ({
      ...t,
      title: t.name,
      body: t.content,
      tags: t.tags ? JSON.parse(t.tags) : [],
      createdAt: new Date(t.created_at).getTime(),
      updatedAt: new Date(t.updated_at).getTime()
    }));
  }

  async addTemplate(userId, { name, content }) {
    const [template] = await this.db('templates')
      .insert({ user_id: userId, name, content })
      .returning('*');
    return template;
  }

  async upsertHandle(userId, { handle, nickname, emojis }) {
    try {
      const [created] = await this.db('handles')
        .insert({ user_id: userId, handle, nickname, emojis })
        .onConflict(['user_id', 'handle'])
        .merge(['nickname', 'emojis'])
        .returning('*');
      return created;
    } catch (error) {
      console.error('Error in upsertHandle:', error.message);
      throw error;
    }
  }

  async upsertTemplate(userId, { id, title, body, tags, favorite, createdAt, updatedAt }) {
    try {
      if (!body) {
        console.log('Skipping template with no body');
        return null;
      }
      
      const name = title || body.substring(0, 50);
      
      const [created] = await this.db('templates')
        .insert({ 
          user_id: userId, 
          name, 
          content: body,
          tags: JSON.stringify(tags || []),
          favorite: favorite || false,
          created_at: createdAt ? new Date(createdAt) : new Date(),
          updated_at: updatedAt ? new Date(updatedAt) : new Date()
        })
        .onConflict(['user_id', 'name', 'content'])
        .merge(['tags', 'favorite', 'updated_at'])
        .returning('*');
      return created;
    } catch (error) {
      console.error('Error in upsertTemplate:', error.message, { userId, title, body: body?.substring(0, 20) });
      return null;
    }
  }
}

module.exports = Database;