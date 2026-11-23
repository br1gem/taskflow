import express from 'express';
import { randomUUID } from 'node:crypto';
import pool from './db/pool.js';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors({
  origin: 'http://localhost:5173',
}));

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

app.get('/api/tasks', async (req, res, next) => {
  try {
    const { status, priority } = req.query;

    const { rows } = await pool.query(
      `SELECT ${taskColumns}
       FROM tasks
       WHERE ($1::text IS NULL OR status = $1)
         AND ($2::text IS NULL OR priority = $2)
       ORDER BY created_at DESC`,
      [status ?? null, priority ?? null],
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/tasks/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${taskColumns} FROM tasks WHERE id = $1`,
      [req.params.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.post('/api/tasks', async (req, res, next) => {
  try {
    const errors = validateTask(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { title, project, status, priority, dueDate } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO tasks (id, title, project, status, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${taskColumns}`,
      [
        randomUUID(),
        title.trim(),
        project.trim(),
        status ?? 'Нужно сделать',
        priority ?? 'Средний',
        dueDate || null,
      ],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/tasks/:id', async (req, res, next) => {
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
       WHERE id = $7
       RETURNING ${taskColumns}`,
      [
        title?.trim() ?? null,
        project?.trim() ?? null,
        status ?? null,
        priority ?? null,
        dueDate !== undefined,
        dueDate || null,
        req.params.id,
      ],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/tasks/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM tasks WHERE id = $1',
      [req.params.id],
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    res.status(204).end();
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