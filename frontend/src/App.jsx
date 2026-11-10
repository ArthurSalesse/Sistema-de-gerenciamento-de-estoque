import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const CHECK_INTERVAL_MS = 5000;

export default function App() {
  const [status, setStatus] = useState('verificando...');

  useEffect(() => {
    const check = () =>
      fetch(`${API_URL}/health`)
        .then((res) => (res.ok ? 'online' : `erro (${res.status})`))
        .catch(() => 'offline')
        .then(setStatus);

    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="container">
      <h1>Bem-vindo 👋</h1>
      <p>O frontend está rodando.</p>
      <p>
        Status da API: <strong className={`status status-${status}`}>{status}</strong>
      </p>
    </main>
  );
}
