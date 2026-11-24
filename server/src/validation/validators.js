const ALLOWED_STATUSES = ['Нужно сделать', 'В работе', 'Готово'];
const ALLOWED_PRIORITIES = ['Низкий', 'Средний', 'Высокий'];
const TASK_FIELDS = ['title', 'project', 'status', 'priority', 'dueDate'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateRegistration(body) {
  if (!isObject(body)) {
    return 'Тело запроса должно быть JSON-объектом';
  }

  const { name, email, password } = body;

  if (typeof name !== 'string' || name.trim().length < 2) {
    return 'Имя должно содержать минимум 2 символа';
  }

  if (typeof email !== 'string' || !email.trim().includes('@')) {
    return 'Укажите корректный email';
  }

  if (typeof password !== 'string' || password.length < 8) {
    return 'Пароль должен содержать минимум 8 символов';
  }

  return null;
}

export function validateLogin(body) {
  if (!isObject(body) || !hasText(body.email) ||
      typeof body.password !== 'string' || body.password.length === 0) {
    return 'Укажите email и пароль';
  }

  return null;
}

export function validateTask(body, { partial = false } = {}) {
  if (!isObject(body)) {
    return 'Тело запроса должно быть JSON-объектом';
  }

  const fields = Object.keys(body);
  const unknownField = fields.find((field) => !TASK_FIELDS.includes(field));

  if (unknownField !== undefined) {
    return `Неизвестное поле: ${unknownField}`;
  }

  if (partial && fields.length === 0) {
    return 'Передайте хотя бы одно поле для изменения';
  }

  if ((!partial || 'title' in body) && !hasText(body.title)) {
    return 'Название задачи обязательно';
  }

  if ((!partial || 'project' in body) && !hasText(body.project)) {
    return 'Проект обязателен';
  }

  if ('status' in body && !ALLOWED_STATUSES.includes(body.status)) {
    return 'Недопустимый статус задачи';
  }

  if ('priority' in body && !ALLOWED_PRIORITIES.includes(body.priority)) {
    return 'Недопустимый приоритет задачи';
  }

  if ('dueDate' in body) {
    const { dueDate } = body;

    if (typeof dueDate !== 'string' || (dueDate !== '' && !DATE_PATTERN.test(dueDate))) {
      return 'Срок должен иметь формат YYYY-MM-DD';
    }
  }

  return null;
}