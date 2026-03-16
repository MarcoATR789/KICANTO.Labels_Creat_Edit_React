import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './app/App';
import { instalarFetchAutenticado } from './auth/apiFetch';

instalarFetchAutenticado();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
