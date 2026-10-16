import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app.js';

describe('Health and Diagnostics API', () => {
  it('GET /api/health should return 200 with service health diagnostics', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('service', 'CodeArena API');
    expect(res.body.data).toHaveProperty('version', '1.0.0');
    expect(res.body.data).toHaveProperty('timestamp');
    expect(res.body.data).toHaveProperty('uptimeSeconds');
    expect(res.body.data).toHaveProperty('database');
    expect(res.body.data.database).toHaveProperty('status');
    expect(res.body.data.database).toHaveProperty('readyState');
  });

  it('GET /api/non-existent-route should return 404 with error envelope', async () => {
    const res = await request(app)
      .get('/api/non-existent-route')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'ROUTE_NOT_FOUND');
  });
});
