import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test } from 'vitest';
import ProtectedRoute from './ProtectedRoute.jsx';

function renderTasksRoute(user) {
  render(
    <MemoryRouter initialEntries={['/tasks']}>
      <Routes>
        <Route path="/login" element={<h1>Вход</h1>} />

        <Route element={<ProtectedRoute user={user} />}>
          <Route path="/tasks" element={<h1>Мои задачи</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

test('гость перенаправляется со страницы задач на страницу входа', async () => {
  renderTasksRoute(null);

  expect(await screen.findByRole('heading', { name: 'Вход' }))
    .toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Мои задачи' }))
    .not.toBeInTheDocument();
});

test('вошедший пользователь видит страницу задач', () => {
  renderTasksRoute({ id: 'test-user', name: 'Тестовый пользователь' });

  expect(screen.getByRole('heading', { name: 'Мои задачи' }))
    .toBeInTheDocument();
});