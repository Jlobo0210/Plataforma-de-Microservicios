import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [service, setService]     = useState(null);
  const [values, setValues]       = useState({});
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(data => {
        const found = data.services[id];
        if (!found) { setError('Servicio no encontrado'); return; }
        setService(found);
        // Inicializa los valores con string vacío o default
        const inicial = {};
        found.params.forEach(p => { inicial[p.name] = p.default ?? ''; });
        setValues(inicial);
      })
      .catch(() => setError('Error cargando el servicio'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExecute = async () => {
    // Valida requeridos
    const empty = service.params.filter(p => p.required && String(values[p.name]).trim() === '');
    if (empty.length > 0) {
      setError(`Completa los campos: ${empty.map(p => p.name).join(', ')}`);
      return;
    }
    setError('');
    setExecuting(true);
    setResult(null);

    try {
      // Convierte a número si aplica
      const converted = {};
      Object.entries(values).forEach(([k, v]) => {
        converted[k] = v !== '' && !isNaN(v) ? Number(v) : v;
      });

      const response = await fetch(service.endpoint + '/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(converted),
      });
      const data = await response.json();
      setResult(data);
    } catch {
      setError('Error al ejecutar el servicio.');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
      Cargando…
    </div>
  );

  if (!service) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-400">
      {error || 'Servicio no encontrado'}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
          ← Volver
        </button>
        <div>
          <h1 className="text-lg font-bold font-mono">{service.name}</h1>
          <p className="text-xs text-slate-500 font-mono">{service.endpoint}</p>
        </div>
      </div>

      <div className="max-w-xl flex flex-col gap-6">
        {/* Parámetros */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-300">Parámetros</h2>

          {service.params.length === 0 ? (
            <p className="text-sm text-slate-500">Este servicio no tiene parámetros.</p>
          ) : (
            service.params.map(p => (
              <div key={p.name}>
                <label className="text-sm text-slate-300 font-medium">
                  {p.name}
                  {p.required && <span className="text-cyan-400 ml-1">*</span>}
                  {p.type && <span className="text-slate-500 ml-2 text-xs">({p.type})</span>}
                </label>
                <input
                  value={values[p.name] ?? ''}
                  onChange={e => {
                    setValues(prev => ({ ...prev, [p.name]: e.target.value }));
                    setError('');
                  }}
                  placeholder={p.default !== null ? `Default: ${p.default}` : `Valor para ${p.name}`}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-600 placeholder:text-slate-600"
                />
              </div>
            ))
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleExecute}
            disabled={executing}
            className="mt-2 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {executing ? 'Ejecutando…' : 'Ejecutar'}
          </button>
        </div>

        {/* Resultado */}
        {result !== null && (
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-300">Resultado</h2>
            <pre className="bg-slate-950 border border-slate-700/40 rounded-lg p-4 text-sm font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}