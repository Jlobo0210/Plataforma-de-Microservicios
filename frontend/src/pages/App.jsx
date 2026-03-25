import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Dashboard from './Dashboard';
import CreateServiceModal from '../components/CreateServiceModal';
import api from '../services/api';

export default function App() {
  const [services, setServices]   = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Carga inicial + polling cada 5s para detectar cambios de estado
  /*useEffect(() => {
    const load = () => api.getAll().then(setServices);
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []); */ 

useEffect(() => {
  const load = () => api.getAll().then(data => {
    if (Array.isArray(data)) {
      setServices(data);
    }
  });
  load();
  const interval = setInterval(load, 5000);
  return () => clearInterval(interval);
}, []);

  const handleCreate = async (data) => {
    const nuevo = await api.create(data);
    setServices(prev => [nuevo, ...prev]);
  }; 

  const handleDelete = async (id) => {
    await api.remove(id);
    setServices(prev => prev.filter(s => s.id !== id));
  };

const handleToggle = async (id, enabled) => {
  await api.toggle(id, enabled);
  setServices(prev => prev.map(s => 
    s.id === id 
      ? { ...s, enabled, status: enabled ? 'active' : 'inactive' }
      : s
  ));
};
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar services={services} onNewService={() => setModalOpen(true)} />

      <main className="flex-1 flex flex-col">
        <header className="flex items-center justify-between px-8 py-5 border-b border-slate-800">
          <div>
            <h1 className="text-lg font-bold">Dashboard</h1>
            <p className="text-xs text-slate-500">Gestión de microservicios Docker</p>
          </div>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
            + Nuevo servicio
          </button>
        </header>

        <div className="flex-1 px-8 py-6">
          <Dashboard services={services} onDelete={handleDelete} onToggle={handleToggle} />
        </div>
      </main>

      <CreateServiceModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreate} />
    </div>
  );
}