const request = require('supertest');
const express = require('express');

// Mock database
const mockDb = {
  getUserByApiKey: jest.fn(),
  getHandles: jest.fn(),
  getTemplates: jest.fn(),
  upsertHandle: jest.fn(),
  upsertTemplate: jest.fn(),
  generateApiKey: jest.fn(),
  getHandleCount: jest.fn()
};

// Create test app
const app = express();
app.use(express.json());

// Add health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add sync routes
const syncRoutes = require('./routes/sync');
app.use('/sync', syncRoutes(mockDb));

describe('Server API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /health returns 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('GET /sync/test requires API key', async () => {
    const response = await request(app).get('/sync/test');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('API key required');
  });

  test('GET /sync/test with valid API key', async () => {
    mockDb.getUserByApiKey.mockResolvedValue({ id: 1, email: 'test@example.com' });
    
    const response = await request(app)
      .get('/sync/test')
      .set('x-api-key', 'valid-key');
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Authentication successful');
  });

  test('GET /sync/data with valid API key', async () => {
    mockDb.getUserByApiKey.mockResolvedValue({ id: 1, email: 'test@example.com' });
    mockDb.getHandles.mockResolvedValue([]);
    mockDb.getTemplates.mockResolvedValue([]);
    
    const response = await request(app)
      .get('/sync/data')
      .set('x-api-key', 'valid-key');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('handles');
    expect(response.body).toHaveProperty('templates');
  });

  test('POST /sync/data with valid data', async () => {
    mockDb.getUserByApiKey.mockResolvedValue({ id: 1, email: 'test@example.com' });
    mockDb.upsertHandle.mockResolvedValue({ id: 1 });
    mockDb.upsertTemplate.mockResolvedValue({ id: 1 });
    
    const response = await request(app)
      .post('/sync/data')
      .set('x-api-key', 'valid-key')
      .send({ handles: [], templates: [] });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});