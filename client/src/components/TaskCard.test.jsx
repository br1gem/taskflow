import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import TaskCard from './TaskCard.jsx';

const task = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Подготовить TaskFlow к защите',
  project: 'TaskFlow',
  status: 'В работе',
  priority: 'Высокий',
  dueDate: '2026-10-01',
};

test('TaskCard показывает данные задачи и ссылку на её страницу', () => {
  render(
    <MemoryRouter>
      <TaskCard
        task={task}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onStatusChange={vi.fn()}
      />
    </MemoryRouter>,
  );

  expect(screen.getByRole('heading', { name: task.title })).toBeInTheDocument();
  expect(screen.getByText(task.project)).toBeInTheDocument();
  expect(screen.getByText(task.status)).toBeInTheDocument();
  expect(screen.getByText(task.priority)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Открыть' })).toHaveAttribute(
    'href',
    `/tasks/${task.id}`,
  );
});