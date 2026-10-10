import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from '../../app/(tabs)/index.tsx';
import Profile from '../../app/(tabs)/profile.tsx';
import Progress from '../../app/(tabs)/progress.tsx';
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function App() {
  const [screen, setScreen] = useState('home');
  const [route, setRoute] = useState('');
  useEffect(() => {
    const fn = (e) => setRoute(e.detail);
    window.addEventListener('route', fn);
    return () => window.removeEventListener('route', fn);
  }, []);
  return (
    <>
      <nav>
        {['home', 'profile', 'progress'].map((s) => (
          <button
            onClick={() => {
              setRoute('');
              setScreen(s);
            }}
            key={s}
          >
            {s}
          </button>
        ))}
      </nav>
      <output data-testid="route">{route}</output>
      {screen === 'home' ? <Home /> : screen === 'profile' ? <Profile /> : <Progress />}
    </>
  );
}
createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={client}>
    <App />
  </QueryClientProvider>,
);
