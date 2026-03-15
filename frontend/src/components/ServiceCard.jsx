import { useState } from 'react';
import StatusBadge from './StatusBadge';

export default function ServiceCard({ service, onDelete, onToggle }) {
  const [confirming, setConfirming] = useState(false);

  const handleDelete = () => {
    if (confirming) { onDelete(service.id); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 3000); }
  };

  const isBuilding = service.status === 'building';
  const langColor = service.language === 'PYTHON'
    ? 'bg-blue-900/30 text-blue-300 border-blue-700/40'
    : 'bg-orange-900/30 text-orange-300 border-orange-700/40';

  return (
    <div className={`relative flex flex-col gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 transition-opacity ${!service.enabled ? 'opacity-50' : ''}`}>
      {/* Top: badges + switch */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 flex-wrap">
          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${langColor}`}>
            {service.language === 'PYTHON' ? '🐍' : '🌐'} {service.language}
          </span>
          <StatusBadge status={service.status} />
        </div>
        {/* Switch */}
        <button
          onClick={() => !isBuilding && onToggle(service.id, !service.enabled)}
          disabled={isBuilding}
          className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-40 ${service.enabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${service.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Nombre y descripción */}
      <div>
        <p className="font-mono font-semibold text-slate-100">{service.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{service.description}</p>
      </div>

      {/* Endpoint */}
      <div className="flex items-center gap-2 bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700/40">
        <span className="text-xs text-slate-500 shrink-0">Endpoint:</span>
        <span className="text-xs font-mono text-cyan-400 truncate">{service.endpoint}</span>
      </div>

      {/* Botón eliminar */}
      <div className="flex justify-end">
        <button
          onClick={handleDelete}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${confirming ? 'bg-red-600 text-white border-red-600' : 'text-slate-500 border-slate-700 hover:text-red-400 hover:border-red-800'}`}
        >
          {confirming ? '¿Confirmar?' : 'Eliminar'}
        </button>
      </div>

      {/* Overlay building */}
      {isBuilding && (
        <div className="absolute inset-0 rounded-xl bg-slate-900/40 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-slate-900/90 px-4 py-2 rounded-full border border-amber-700/50 text-xs text-amber-300">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
            Construyendo imagen…
          </div>
        </div>
      )}
    </div>
  );
}