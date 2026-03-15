// Cambia USE_MOCK a false cuando tengas el backend listo
const USE_MOCK = true;
const BASE_URL = '/api/microservices';

import { MOCK_SERVICES } from './mockData';

let store = [...MOCK_SERVICES];

// ── Mock local ──────────────────────────────────────────────
const mock = {
  getAll: () => Promise.resolve([...store]),

  create: (data) => {
    const nuevo = { ...data, id: Date.now().toString(), status: 'building', enabled: true, endpoint: `http://localhost:${3000 + store.length + 1}` };
    store = [nuevo, ...store];
    // Simula que después de 3s el contenedor queda activo
    setTimeout(() => { store = store.map(s => s.id === nuevo.id ? { ...s, status: 'active' } : s); }, 3000);
    return Promise.resolve(nuevo);
  },

  remove: (id) => { store = store.filter(s => s.id !== id); return Promise.resolve(); },

  toggle: (id, enabled) => {
    store = store.map(s => s.id === id ? { ...s, enabled, status: enabled ? 'active' : 'disabled' } : s);
    return Promise.resolve(store.find(s => s.id === id));
  },
};

// ── API real ────────────────────────────────────────────────
const api = {
  getAll: () => fetch(BASE_URL).then(r => r.json()),

  create: (data) => fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json()),

  remove: (id) => fetch(`${BASE_URL}/${id}`, { method: 'DELETE' }),

  toggle: (id, enabled) => fetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  }).then(r => r.json()),
};

export default USE_MOCK ? mock : api;