# TaskFlow

TaskFlow — учебное веб-приложение для управления личными задачами. Каждый пользователь работает со своим списком задач.

## Возможности

- Регистрация, вход, выход и личный кабинет.
- Создание, просмотр, редактирование и удаление задач.
- Статусы, приоритеты и сроки выполнения.
- Поиск по названию или проекту, фильтры по статусу и приоритету.
- Обновление списка задач и данных профиля без перезагрузки страницы.
- Автоматические тесты API и React-компонентов.

## Технологии

- Клиент — React, Vite, React Router.
- Сервер — Node.js, Express, PostgreSQL и `pg`.
- Авторизация — `bcrypt`, `express-session`, `connect-pg-simple`.
- Тестирование — Vitest, Supertest, React Testing Library и jsdom.

## Структура проекта

```text
taskflow/
  client/      React-интерфейс и тесты компонентов
  server/      Express API и интеграционные тесты
  .gitignore
  README.md
```

## Требования

- Node.js 22.12 или новее.
- npm.
- Запущенный PostgreSQL.
- Git, если проект получен из репозитория.

## Подготовка PostgreSQL

Создайте базу `taskflow`. Откройте в ней Query Tool в pgAdmin и выполните SQL под тем же пользователем PostgreSQL, которого укажете в `DB_USER`.

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  project VARCHAR(120) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Нужно сделать'
    CHECK (status IN ('Нужно сделать', 'В работе', 'Готово')),
  priority VARCHAR(20) NOT NULL DEFAULT 'Средний'
    CHECK (priority IN ('Низкий', 'Средний', 'Высокий')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Таблица `user_sessions` создаётся автоматически при первом сохранении сессии.

## Настройка и установка

Из корня проекта скопируйте шаблон настроек.

```bash
cp server/.env.example server/.env
```

В `server/.env` заполните `DB_USER` и `DB_PASSWORD` данными своего PostgreSQL. Для `SESSION_SECRET` сгенерируйте случайное значение командой `openssl rand -hex 32` и вставьте результат после `SESSION_SECRET=`. Для локального запуска оставьте `PORT=3000` и `DB_NAME=taskflow`.

Затем установите зависимости клиента и сервера. Команды начинаются из корня проекта.

```bash
cd client
npm install

cd ../server
npm install
```

## Запуск в режиме разработки

В первом терминале из корня проекта запустите Express.

```bash
cd server
npm run dev
```

Во втором терминале из корня проекта запустите Vite.

```bash
cd client
npm run dev
```

- Интерфейс — [http://localhost:5173](http://localhost:5173).
- Проверка API — [http://localhost:3000/api/health](http://localhost:3000/api/health).

## Тестирование

**Сервер.** Создайте отдельную базу `taskflow_test`. Откройте Query Tool именно для `taskflow_test` и выполните тот же SQL из раздела «Подготовка PostgreSQL». В `server/.env` оставьте `DB_NAME=taskflow`. Команда тестирования сама переключает подключение на `taskflow_test`.

Из корня проекта выполните:

```bash
cd server
npm test
```

Серверные тесты проверяют доступность API, регистрацию, вход после выхода, получение списка задач, создание задачи и ответ `400` при недопустимом статусе.

Дополнительный серверный тест проверяет, что запрос GET /api/unknown возвращает 404 Not Found и JSON с сообщением о неизвестном маршруте.

**Клиент.** В другом терминале из корня проекта выполните:

```bash
cd client
npm test
```

Клиентские тесты проверяют `TaskCard`, `ProtectedRoute` и `ErrorState`.

## Запуск production-сборки

Остановите процессы разработки через `Ctrl + C`. PostgreSQL оставьте запущенным. Из корня проекта выполните:

```bash
cd client
npm run build

cd ../server
npm run start:prod
```

Откройте [http://localhost:3000](http://localhost:3000). Express отдаёт React-интерфейс из `client/dist` и обслуживает запросы к API на том же адресе.

## Демонстрация

Откройте `/register` и создайте тестовый аккаунт. Перейдите в «Мои задачи», создайте задачу и измените её статус. Откройте «Профиль» и проверьте количество задач. Обновите страницу, чтобы убедиться, что вход сохранился.