import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import GlobalExperience from './components/GlobalExperience';
import { registerPwa } from './services/pwa';
import './index.css';

registerPwa();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GlobalExperience><App /></GlobalExperience>
  </React.StrictMode>
);
