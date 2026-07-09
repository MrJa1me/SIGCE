import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from './icons';
import { useBorderCrossings } from '../context/BorderCrossingsContext';
import {
  createBorderCrossing,
  deleteBorderCrossing,
  getBorderCrossingPresets,
} from '../services/api';

const NEIGHBOR_COUNTRIES = ['Argentina', 'Perú', 'Bolivia'];

function CrossingPreview({ crossing }) {
  if (!crossing) return null;
  return (
    <div className="border-crossing-preview card" style={{ borderTop: `4px solid ${crossing.color}` }}>
      <h4>Vista previa — datos automáticos</h4>
      <div className="preview-grid">
        <div><strong>Lugar:</strong> {crossing.location}</div>
        <div><strong>Región:</strong> {crossing.region}</div>
        <div><strong>País vecino:</strong> {crossing.country}</div>
        <div><strong>Flujo diario:</strong> {crossing.stats?.dailyFlow}</div>
        <div><strong>Espera promedio:</strong> {crossing.stats?.avgWait}</div>
        <div><strong>Altitud:</strong> {crossing.stats?.altitude}</div>
      </div>
      <p className="card-subtitle">{crossing.description}</p>
    </div>
  );
}

function AdminBorderCrossings({ online, onMessage }) {
  const { crossings, refresh } = useBorderCrossings();
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [mode, setMode] = useState('catalog');
  const [presetId, setPresetId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCountry, setCustomCountry] = useState('Argentina');
  const [error, setError] = useState('');

  const loadPresets = useCallback(async () => {
    if (!online) {
      setPresets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setPresets(await getBorderCrossingPresets());
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [online]);

  useEffect(() => {
    loadPresets();
  }, [loadPresets, crossings.length]);

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === presetId),
    [presets, presetId]
  );

  const customPreview = useMemo(() => {
    if (mode !== 'custom' || !customName.trim()) return null;
    const slug = customName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const theme = {
      Argentina: { color: '#1a5276' },
      Perú: { color: '#922b21' },
      Bolivia: { color: '#1e6f3d' },
    }[customCountry] || { color: '#1a5276' };
    return {
      id: slug,
      name: customName.trim().startsWith('Paso') ? customName.trim() : `Paso ${customName.trim()}`,
      region: customCountry === 'Perú' ? 'Región de Arica y Parinacota' : customCountry === 'Bolivia' ? 'Región de Antofagasta' : 'Región de Los Lagos',
      country: customCountry,
      location: `Frontera Chile — ${customCountry}`,
      color: theme.color,
      description: `Paso fronterizo terrestre entre Chile y ${customCountry}.`,
      stats: {
        dailyFlow: customCountry === 'Perú' ? '3,000+' : customCountry === 'Bolivia' ? '600+' : '2,000+',
        avgWait: customCountry === 'Bolivia' ? '45-90 min' : '1-3 hrs',
        altitude: customCountry === 'Bolivia' ? '3,800 m s.n.m.' : customCountry === 'Perú' ? '800 m s.n.m.' : '1,500 m s.n.m.',
      },
    };
  }, [mode, customName, customCountry]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    try {
      const body = mode === 'catalog'
        ? { presetId }
        : { name: customName.trim(), country: customCountry };

      if (mode === 'catalog' && !presetId) {
        throw new Error('Selecciona un paso del catálogo');
      }
      if (mode === 'custom' && !customName.trim()) {
        throw new Error('Ingresa el nombre del paso');
      }

      await createBorderCrossing(body);
      onMessage?.('success', 'Paso fronterizo creado correctamente');
      setPresetId('');
      setCustomName('');
      await Promise.all([refresh(), loadPresets()]);
    } catch (err) {
      setError(err.message);
      onMessage?.('error', err.message);
    }
    setActionLoading(false);
  };

  const handleDelete = async (crossing) => {
    if (!confirm(`¿Eliminar "${crossing.name}"? Solo es posible si no tiene trámites asociados.`)) return;
    setActionLoading(true);
    setError('');
    try {
      await deleteBorderCrossing(crossing.id);
      onMessage?.('success', `Paso "${crossing.shortName || crossing.name}" eliminado`);
      await Promise.all([refresh(), loadPresets()]);
    } catch (err) {
      setError(err.message);
      onMessage?.('error', err.message);
    }
    setActionLoading(false);
  };

  const grouped = useMemo(() => {
    const map = {};
    for (const c of crossings) {
      const key = c.country || 'Otro';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    return map;
  }, [crossings]);

  return (
    <div className="admin-border-crossings">
      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card total-stat">
          <span className="stat-number">{crossings.length}</span>
          <span className="stat-label">Pasos activos</span>
          <span className="stat-icon"><Icon name="globe" size="md" /></span>
        </div>
        <div className="stat-card accepted-stat">
          <span className="stat-number">{grouped.Argentina?.length || 0}</span>
          <span className="stat-label">Chile — Argentina</span>
        </div>
        <div className="stat-card review-stat">
          <span className="stat-number">{grouped['Perú']?.length || 0}</span>
          <span className="stat-label">Chile — Perú</span>
        </div>
        <div className="stat-card pending-stat">
          <span className="stat-number">{grouped.Bolivia?.length || 0}</span>
          <span className="stat-label">Chile — Bolivia</span>
        </div>
      </div>

      {online && (
        <div className="card admin-form-card">
          <h3 className="page-title-with-icon">
            <Icon name="globe" size="sm" /> Añadir paso fronterizo
          </h3>
          <p className="card-subtitle">
            Selecciona un paso del catálogo oficial o ingresa un nombre personalizado.
            Los datos de lugar, flujo, espera y altitud se completan automáticamente.
          </p>

          <div className="border-crossing-mode-tabs">
            <button
              type="button"
              className={`filter-tab ${mode === 'catalog' ? 'active' : ''}`}
              onClick={() => setMode('catalog')}
            >
              Del catálogo
            </button>
            <button
              type="button"
              className={`filter-tab ${mode === 'custom' ? 'active' : ''}`}
              onClick={() => setMode('custom')}
            >
              Nombre personalizado
            </button>
          </div>

          <form onSubmit={handleCreate}>
            {mode === 'catalog' ? (
              <div className="form-group">
                <label>Paso del catálogo</label>
                <select value={presetId} onChange={(e) => setPresetId(e.target.value)} required={mode === 'catalog'}>
                  <option value="">— Selecciona un paso —</option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.country})
                    </option>
                  ))}
                </select>
                {presets.length === 0 && !loading && (
                  <p className="form-hint">Todos los pasos del catálogo ya están registrados.</p>
                )}
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre del paso</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ej: Paso Integración Austral"
                    required={mode === 'custom'}
                  />
                </div>
                <div className="form-group">
                  <label>País vecino</label>
                  <select value={customCountry} onChange={(e) => setCustomCountry(e.target.value)}>
                    {NEIGHBOR_COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <CrossingPreview crossing={mode === 'catalog' ? selectedPreset : customPreview} />

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={actionLoading || (mode === 'catalog' && !presetId)}>
                {actionLoading ? 'Creando...' : 'Crear paso fronterizo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Cargando pasos fronterizos...</div>
      ) : (
        <div className="border-crossings-admin-list">
          {Object.entries(grouped).map(([country, list]) => (
            <div key={country} className="card">
              <h3>Chile — {country}</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Paso</th>
                      <th>Región</th>
                      <th>Lugar</th>
                      <th>Flujo diario</th>
                      <th>Espera</th>
                      <th>Altitud</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.name}</strong>
                          <br />
                          <code>{c.code}</code>
                        </td>
                        <td>{c.region}</td>
                        <td>{c.location}</td>
                        <td>{c.stats?.dailyFlow}</td>
                        <td>{c.stats?.avgWait}</td>
                        <td>{c.stats?.altitude}</td>
                        <td className="actions-cell">
                          <button
                            type="button"
                            className="btn btn-sm btn-reject"
                            onClick={() => handleDelete(c)}
                            disabled={!online || actionLoading}
                            title="Eliminar"
                          >
                            <Icon name="x" size="sm" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminBorderCrossings;
