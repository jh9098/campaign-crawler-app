import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root')); // ✅ 괄호 짝 맞춰야 함
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
