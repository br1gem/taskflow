import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser } from '../api/authApi.js';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getCurrentUser();
      setProfile(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (!profile) {
    return loading ? (
      <LoadingState />
    ) : (
      <ErrorState message={error} onRetry={loadProfile} />
    );
  }

  const registeredAt = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(profile.createdAt));

  return (
    <section className="profileCard">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Личный кабинет</p>
          <h1>{profile.name}</h1>
        </div>

        <button
          className="ghostButton"
          type="button"
          onClick={loadProfile}
          disabled={loading}
        >
          {loading ? 'Обновление…' : 'Обновить данные'}
        </button>
      </div>

      {error && <ErrorState message={error} />}

      <dl className="profileGrid">
        <div>
          <dt>Email</dt>
          <dd>{profile.email}</dd>
        </div>

        <div>
          <dt>Количество задач</dt>
          <dd>{profile.taskCount}</dd>
        </div>

        <div>
          <dt>Дата регистрации</dt>
          <dd>{registeredAt}</dd>
        </div>
      </dl>
    </section>
  );
}