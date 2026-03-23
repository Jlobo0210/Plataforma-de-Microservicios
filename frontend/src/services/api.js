// Cambia USE_MOCK a false cuando tengas el backend listo
const USE_MOCK = false;
const BASE_URL = '/api/services';

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
  getAll: () =>
  fetch(BASE_URL)
    .then(r => r.json())
    .then(data => {
      console.log('data cruda del backend:', data);  // ← para ver qué llega
      if (!data.services) return [];  // ← si no hay services devuelve array vacío
      return Object.entries(data.services).map(([id, service]) => ({
        id,
        ...service,
        enabled: true,
        status: 'active'
      }));
    }),

  create: (data) =>
    fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(r => r.json())
      .then(service => {
        console.log('respuesta cruda de create:', service);
        return {
          id: service.service_id,
          ...service,
          enabled: true,
          status: 'active'
        };
      }),

  remove: (id) => fetch(`${BASE_URL}/${id}`, { method: 'DELETE' }),

  toggle: (id, enabled) => Promise.resolve(),

  getParams: (id) => fetch(`${BASE_URL}/${id}/params`).then(r => r.json()),
};

export default USE_MOCK ? mock : api;