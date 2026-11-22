import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import StatCard from './components/StatCard.jsx';
import TaskCard from './components/TaskCard.jsx';
import { tasks } from './data/tasks.js';

export default function App() {
  const inProgress = tasks.filter((task) => task.status === 'В работе').length;
  const completed = tasks.filter((task) => task.status === 'Готово').length;
  const projectCount = new Set(tasks.map((task) => task.project)).size;
  const overdue = tasks.filter((task) => task.isOverdue).length;

  return (
    <div className="appShell">
      <Sidebar />

      <main className="content">
        <Header />

        <section className="statsGrid" aria-label="Статистика">
          <StatCard label="Всего задач" value={tasks.length} note="В списке" />
          <StatCard label="В работе" value={inProgress} note="Начаты" />
          <StatCard label="Готово" value={completed} note="Завершены" />
          <StatCard label="Проектов" value={projectCount} note="В списке задач" />
          <StatCard label="Просрочено" value={overdue} note="Срок истёк" />
        </section>

        <section className="panel">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Фокус</p>
              <h2>Ближайшие задачи</h2>
            </div>
            <button className="ghostButton" type="button">
              Показать все
            </button>
          </div>

          <div className="taskList">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}