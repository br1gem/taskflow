import express from 'express';
import { randomUUID } from 'node:crypto';
import pool from './db/pool.js';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcrypt';
import { requireAuth } from './middleware/requireAuth.js';

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET не задан в .env');
}

const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(express.json());

const allowedStatuses = ['Нужно сделать', 'В работе', 'Готово'];
const allowedPriorities = ['Низкий', 'Средний', 'Высокий'];
const taskFields = ['title', 'project', 'status', 'priority', 'dueDate'];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const taskColumns = `
  id, title, project, status, priority,
  due_date::text AS "dueDate",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

function validateTask(data, partial = false) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return ['Тело запроса должно быть JSON-объектом'];
  }

  const errors = [];

  if (!partial || data.title !== undefined) {
    if (typeof data.title !== 'string' || !data.title.trim()) {
      errors.push('Поле title обязательно');
    }
  }

  if (!partial || data.project !== undefined) {
    if (typeof data.project !== 'string' || !data.project.trim()) {
      errors.push('Поле project обязательно');
    }
  }

  if (data.status !== undefined && !allowedStatuses.includes(data.status)) {
    errors.push('Недопустимый status');
  }

  if (data.priority !== undefined && !allowedPriorities.includes(data.priority)) {
    errors.push('Недопустимый priority');
  }

  if (data.dueDate !== undefined && typeof data.dueDate !== 'string') {
    errors.push('Поле dueDate должно быть строкой');
  }

  if (partial && !taskFields.some((field) => data[field] !== undefined)) {
    errors.push('Передайте хотя бы одно поле для изменения');
  }

  return errors;
}

async function getUserProfile(userId) {
  const { rows } = await pool.query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.created_at AS "createdAt",
       COUNT(t.id)::int AS "taskCount"
     FROM users u
     LEFT JOIN tasks t ON t.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId],
  );

  return rows[0] ?? null;
}

app.param('id', (req, res, next, id) => {
  if (!uuidPattern.test(id)) {
    return res.status(400).json({ message: 'Некорректный id задачи' });
  }

  next();
});

app.get('/api/health', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS db_time');

    res.json({
      status: 'ok',
      database: 'connected',
      dbTime: rows[0].db_time,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail =
      typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (normalizedName.length < 2) {
      return res.status(400).json({
        message: 'Имя должно содержать минимум 2 символа',
      });
    }

    if (!normalizedEmail.includes('@')) {
      return res.status(400).json({
        message: 'Укажите корректный email',
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        message: 'Пароль должен содержать минимум 8 символов',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = randomUUID();

    await pool.query(
      `INSERT INTO users (id, name, email, password_hash)
       VALUES ($1, $2, $3, $4)`,
      [userId, normalizedName, normalizedEmail, passwordHash],
    );

    req.session.userId = userId;

    const user = await getUserProfile(userId);
    return res.status(201).json(user);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'Пользователь с таким email уже существует',
      });
    }

    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    const normalizedEmail =
      typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || typeof password !== 'string' || !password) {
      return res.status(400).json({
        message: 'Укажите email и пароль',
      });
    }

    const { rows } = await pool.query(
      `SELECT id, password_hash
       FROM users
       WHERE email = $1`,
      [normalizedEmail],
    );

    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        message: 'Неверный email или пароль',
      });
    }

    req.session.userId = user.id;

    const profile = await getUserProfile(user.id);
    return res.json(profile);
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie('connect.sid');
    return res.status(204).end();
  });
});

app.get('/api/auth/me', requireAuth, async (req, res, next) => {
  try {
    const user = await getUserProfile(req.session.userId);

    if (!user) {
      return res.status(401).json({
        message: 'Сессия пользователя недействительна',
      });
    }

    return res.json(user);
  } catch (error) {
    next(error);
  }
});

app.get('/api/tasks', requireAuth, async (req, res, next) => {
  try {
    const { status, priority } = req.query;

    const { rows } = await pool.query(
      `SELECT ${taskColumns}
       FROM tasks
       WHERE user_id = $1
         AND ($2::text IS NULL OR status = $2)
         AND ($3::text IS NULL OR priority = $3)
       ORDER BY created_at DESC`,
      [req.session.userId, status ?? null, priority ?? null],
    );

    return res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/tasks/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${taskColumns}
       FROM tasks
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.session.userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    return res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.post('/api/tasks', requireAuth, async (req, res, next) => {
  try {
    const errors = validateTask(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { title, project, status, priority, dueDate } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO tasks (id, user_id, title, project, status, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${taskColumns}`,
      [
        randomUUID(),
        req.session.userId,
        title.trim(),
        project.trim(),
        status ?? 'Нужно сделать',
        priority ?? 'Средний',
        dueDate || null,
      ],
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/tasks/:id', requireAuth, async (req, res, next) => {
  try {
    const errors = validateTask(req.body, true);

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { title, project, status, priority, dueDate } = req.body;

    const { rows } = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           project = COALESCE($2, project),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           due_date = CASE WHEN $5::boolean THEN $6::date ELSE due_date END,
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING ${taskColumns}`,
      [
        title?.trim() ?? null,
        project?.trim() ?? null,
        status ?? null,
        priority ?? null,
        dueDate !== undefined,
        dueDate || null,
        req.params.id,
        req.session.userId,
      ],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    return res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/tasks/:id', requireAuth, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.userId],
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    return res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint не найден' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Некорректный JSON в теле запроса' });
  }

  const badDataCodes = ['22P02', '22001', '22007', '22008', '23502', '23514'];

  if (badDataCodes.includes(error.code)) {
    return res.status(400).json({
      message: 'База данных отклонила переданные данные',
    });
  }

  console.error(error);
  res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`TaskFlow API: http://localhost:${PORT}`);
});