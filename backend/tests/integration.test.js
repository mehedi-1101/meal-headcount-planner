import request from 'supertest';
import express from 'express';
import session from 'express-session';
import authRoutes from '../src/routes/auth.js';
import mealRoutes from '../src/routes/meals.js';
import headcountRoutes from '../src/routes/headcount.js';

// Create test app
const app = express();
app.use(express.json());
app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: false
}));
app.use('/api/auth', authRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/headcount', headcountRoutes);

const TODAY = new Date().toISOString().split('T')[0];

describe('Authentication & Authorization', () => {
  test('login succeeds with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'pass123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login successful');
  });

  test('login fails with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  test('protected route rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/headcount');
    expect(res.status).toBe(401);
  });

  test('EMPLOYEE cannot access headcount', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'alice', password: 'pass123' });
    const res = await agent.get(`/api/headcount?date=${TODAY}`);
    expect(res.status).toBe(403);
  });

  test('ADMIN can access headcount', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'admin', password: 'pass123' });
    const res = await agent.get(`/api/headcount?date=${TODAY}`);
    expect(res.status).toBe(200);
  });

  test('LOGISTICS can access headcount', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'logistics', password: 'pass123' });
    const res = await agent.get(`/api/headcount?date=${TODAY}`);
    expect(res.status).toBe(200);
  });
});

describe('Role-Based Override', () => {
  test('TEAM_LEAD can override own team member', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'bob', password: 'pass123' });

    const res = await agent
      .post('/api/meals/override')
      .send({ targetUserId: 'u1', mealType: 'LUNCH', status: 'OUT' });

    expect(res.status).toBe(200);
  });

  test('TEAM_LEAD cannot override different team member', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'bob', password: 'pass123' });

    const res = await agent
      .post('/api/meals/override')
      .send({ targetUserId: 'u3', mealType: 'LUNCH', status: 'OUT' });

    expect(res.status).toBe(403);
  });

  test('ADMIN can override any user', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'admin', password: 'pass123' });

    const res = await agent
      .post('/api/meals/override')
      .send({ targetUserId: 'u3', mealType: 'LUNCH', status: 'OUT' });

    expect(res.status).toBe(200);
  });
});
