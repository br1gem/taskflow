import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import ErrorState from './ErrorState.jsx';

test('ErrorState показывает ошибку и вызывает повторную загрузку', () => {
  const onRetry = vi.fn();

  render(<ErrorState message="Сервер недоступен" onRetry={onRetry} />);

  const alert = screen.getByRole('alert');
  expect(within(alert).getByText('Сервер недоступен')).toBeInTheDocument();

  fireEvent.click(within(alert).getByRole('button', { name: 'Повторить' }));

  expect(onRetry).toHaveBeenCalledTimes(1);
});