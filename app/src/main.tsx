import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Dev-only debugging handle (stripped from production builds).
if (import.meta.env.DEV) {
  Promise.all([import('./store/gameStore'), import('./components/game/PlayerController')]).then(([{ useGame }, { playerPose }]) => {
    Object.assign(window, { __toxilab: useGame, __pose: playerPose });
  });
}
