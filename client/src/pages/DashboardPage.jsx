import { Link } from 'react-router-dom';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import StatCard from '../components/StatCard.jsx';
import TaskCard from '../components/TaskCard.jsx';

export default function DashboardPage({
  tasks,
  loading,
  error,
  onRetry,
  onStatusChange,
  onDelete,
}) {
  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  const totalCount = tasks.length;
  const progressCount = tasks.filter((task) => task.status === 'В работе').length;
  const doneCount = tasks.filter((task) => task.status === 'Готово').length;
  const projectCount = new Set(tasks.map((task) => task.project)).size;

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Учебный проект</p>
          <h1>Обзор TaskFlow</h1>
          <p className="subtitle">
            Данные загружаются из PostgreSQL через REST API.
          </p>
        </div>

        <Link className="primaryButton linkButton" to="/tasks">
          Открыть задачи
        </Link>
      </header>

      <section className="statsGrid" aria-label="Статистика">
        <StatCard label="Всего задач" value={totalCount} note="В базе данных" />
        <StatCard label="В работе" value={progressCount} note="Активные задачи" />
        <StatCard label="Готово" value={doneCount} note="Завершено" />
        <StatCard label="Проектов" value={projectCount} note="Уникальные проекты" />
      </section>

      <section className="panel">
        <div className="sectionHeading">
          <h2>Последние задачи</h2>

          <Link className="ghostButton linkButton" to="/tasks">
            Показать все
          </Link>
        </div>

        <div className="taskList">
          {tasks.slice(0, 3).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))}
        </div>
      </section>
    </>
  );
}