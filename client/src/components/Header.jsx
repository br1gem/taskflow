export default function Header() {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Учебный проект</p>
        <h1>Добро пожаловать в TaskFlow</h1>
        <p className="subtitle">
          Учебные задачи, проекты и сроки в одном месте.
        </p>
      </div>

      <button className="primaryButton" type="button">
        + Новая задача
      </button>
    </header>
  );
}