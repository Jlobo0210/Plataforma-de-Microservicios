import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [params, setParams]       = useState([]);
  const [values, setValues]       = useState({});
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    api.getParams(id)
      .then(data => {
        // data debe ser algo como { params: ["a", "b"] } o [{ name: "a" }, ...]
        const lista = Array.isArray(data) ? data : data.params ?? [];
        setParams(lista);
        const inicial = {};
        lista.forEach(p => { inicial[typeof p === 'string' ? p : p.name] = ''; });
        setValues(inicial);
      })
      .catch(() => setError('No se pudieron cargar los parámetros del servicio.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExecute = async () => {
    const empty = Object.entries(values).filter(([, v]) => v.trim() === '');
    if (empty.length > 0) {
      setError(`Completa todos los parámetros: ${empty.map(([k]) => k).join(', ')}`);
      return;
    }
    setError('');
    setExecuting(true);
    setResult(null);
    try {
      const response = await fetch(`/api/services/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      setResult(data);
    } catch {
      setError('Error al ejecutar el servicio.');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors"
        >
          ← Volver
        </button>
        <div>
          <h1 className="text-lg font-bold">Ejecutar servicio</h1>
          <p className="text-xs text-slate-500 font-mono">/api/services/{id}</p>
        </div>
      </div>

      <div className="max-w-xl flex flex-col gap-6">
        {/* Parámetros */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-300">Parámetros</h2>

          {loading ? (
            <p className="text-sm text-slate-500">Cargando parámetros…</p>
          ) : params.length === 0 ? (
            <p className="text-sm text-slate-500">Este servicio no tiene parámetros.</p>
          ) : (
            params.map(p => {
              const name = typeof p === 'string' ? p : p.name;
              return (
                <div key={name}>
                  <label className="text-sm text-slate-300 font-medium">
                    {name} <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    value={values[name] ?? ''}
                    onChange={e => {
                      setValues(prev => ({ ...prev, [name]: e.target.value }));
                      setError('');
                    }}
                    placeholder={`Valor para ${name}`}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-600 placeholder:text-slate-600"
                  />
                </div>
              );
            })
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleExecute}
            disabled={executing || loading || params.length === 0}
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