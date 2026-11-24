import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import app from '../app.js';
import pool from '../db/pool.js';

const password = 'password123';

const taskData = {
  title: 'Проверить тесты',
  project: 'TaskFlow',
  status: 'В работе',
  priority: 'Высокий',
  dueDate: '2026-10-01',
};

let account;

beforeAll(async () => {
  const { rows } = await pool.query('SELECT current_database() AS name');

  if (rows[0].name !== 'taskflow_test') {
    throw new Error('Запускай тесты только на базе taskflow_test');
  }
});

afterEach(async () => {
  if (!account) {
    return;
  }

  const { agent, email } = account;
  account = undefined;

  try {
    await agent.post('/api/auth/logout').expect(204);
  } finally {
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
  }
});

afterAll(async () => {
  await pool.end();
});

async function registerTestUser() {
  const agent = request.agent(app);
  const email = `taskflow-test-${randomUUID()}@example.com`;
  account = { agent, email };

  const response = await agent
    .post('/api/auth/register')
    .send({ name: 'Test Student', email, password })
    .expect(201);

  return { agent, email, response };
}

describe('TaskFlow API', () => {
  test('GET /api/health подтверждает подключение к базе', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      database: 'connected',
    });
  });

  test('регистрация создаёт пользователя и сессию', async () => {
    const { email, response } = await registerTestUser();

    expect(response.body.email).toBe(email);
    expect(response.headers['set-cookie']).toBeDefined();
  });

  test('пользователь может войти после выхода', async () => {
    const { agent, email } = await registerTestUser();

    await agent.post('/api/auth/logout').expect(204);

    const response = await agent
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(response.body.email).toBe(email);
  });

  test('новый пользователь получает пустой список задач', async () => {
    const { agent } = await registerTestUser();

    const response = await agent.get('/api/tasks').expect(200);

    expect(response.body).toEqual([]);
  });

  test('авторизованный пользователь может создать задачу', async () => {
    const { agent } = await registerTestUser();

    const response = await agent
      .post('/api/tasks')
      .send(taskData)
      .expect(201);

    expect(response.body.title).toBe(taskData.title);
    expect(response.body.id).toBeTruthy();
  });

  test('задача с недопустимым статусом возвращает 400', async () => {
    const { agent } = await registerTestUser();

    const response = await agent
      .post('/api/tasks')
      .send({ ...taskData, status: 'Когда-нибудь' })
      .expect(400);

    expect(response.body.message).toBe('Недопустимый статус задачи');
  });

  test('неизвестный маршрут API возвращает 404', async () => {
  const response = await request(app)
    .get('/api/unknown')
    .expect(404);

  expect(response.body).toEqual({
    message: 'Маршрут GET /api/unknown не найден',
  });
});
});