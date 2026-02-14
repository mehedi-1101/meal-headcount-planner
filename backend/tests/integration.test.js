import request from 'supertest';
import express from 'express';
import session from 'express-session';
import authRoutes from '../src/routes/auth.js';
import mealRoutes from '../src/routes/meals.js';
import headcountRoutes from '../src/routes/headcount.js';
import { requireAuth } from '../src/middleware/auth.js';

// Create test app
const app = express();
app.use(express.json());
app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: false
}));
app.use('/auth', authRoutes);
app.use('/meals', mealRoutes);
app.use('/headcount', headcountRoutes);

describe('Authentication & Authorization', () => {
  test('login succeeds with valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'mehedi', password: 'pass123' });
    
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login successful');
  });

  test('login fails with invalid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'mehedi', password: 'wrongpass' });
    
    expect(res.status).toBe(401);
  });

  test('protected route rejects unauthenticated request', async () => {
    const res = await request(app)
      .get('/headcount');
    
    expect(res.status).toBe(401);
  });

  test('EMPLOYEE cannot access headcount', async () => {
    const agent = request.agent(app);
    
    await agent
      .post('/auth/login')
      .send({ username: 'alice', password: 'pass123' });
    
    const res = await agent.get('/headcount');
    expect(res.status).toBe(403);
  });

  test('ADMIN can access headcount', async () => {
    const agent = request.agent(app);
    
    await agent
      .post('/auth/login')
      .send({ username: 'mehedi', password: 'pass123' });
    
    const res = await agent.get('/headcount');
    expect(res.status).toBe(200);
  });

  test('LOGISTICS can access headcount', async () => {
    const agent = request.agent(app);
    
    await agent
      .post('/auth/login')
      .send({ username: 'logistics', password: 'pass123' });
    
    const res = await agent.get('/headcount');
    expect(res.status).toBe(200);
  });
});

describe('Role-Based Override', () => {
  test('TEAM_LEAD can override own team member', async () => {
    const agent = request.agent(app);
    
    await agent
      .post('/auth/login')
      .send({ username: 'bob', password: 'pass123' });
    
    const res = await agent
      .post('/meals/LUNCH/override')
      .send({ targetUserId: 'u1770959607924', status: 'OUT' });
    
    expect(res.status).toBe(200);
  });

  test('TEAM_LEAD cannot override different team member', async () => {
    const agent = request.agent(app);
    
    await agent
      .post('/auth/login')
      .send({ username: 'bob', password: 'pass123' });
    
    const res = await agent
      .post('/meals/LUNCH/override')
      .send({ targetUserId: 'u1770959613106', status: 'OUT' });
    
    expect(res.status).toBe(403);
  });

  test('ADMIN can override any user', async () => {
    const agent = request.agent(app);
    
    await agent
      .post('/auth/login')
      .send({ username: 'mehedi', password: 'pass123' });
    
    const res = await agent
      .post('/meals/LUNCH/override')
      .send({ targetUserId: 'u1770959613106', status: 'OUT' });
    
    expect(res.status).toBe(200);
  });
});
