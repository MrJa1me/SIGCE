import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { getLocalCheckins, updateLocalCheckinStatus, queueStatusChange } from '../services/offlineDb';
import { getPendingCheckins, getCheckins, updateCheckinStatus } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { BORDER_CROSSINGS } from '../services/borderCrossings';

function OfficialPanel() {
  const { user, online } = useAuth();
  const navigate = useNavigate();
  const [checkins, setCheckins] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [stats, setStats] = useState({ pending: 0, accepted: 0, rejected: 0, review: 0 });

  const loadCheckins = useCallback(async () => {
    setLoading(true);
    try {
      let mergedData = [];
      if (online) {
        const [pendingData, allData] = await Promise.all([
          getPendingCheckins().catch(() => []),
          getCheckins().catch(() => []),
        ]);
        const localData = await getLocalCheckins();
        const serverMap = {};
        for (const s of allData) serverMap[s.localId || s.id] = s;
        mergedData = localData.map(local => {
          const server = serverMap[local.localId];
          return server ? { ...local, ...server, synced: true } : local;
        });
        for (const s of allData) {
          if (!mergedData.find(m => m.localId === s.localId || m.id === s.id)) {
            mergedData.push({ ...s, synced: true });
          }
        }
      } else {
        mergedData = await getLocalCheckins();
      }
      mergedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setCheckins(mergedData);
      const s = { pending: 0, accepted: 0, rejected: 0, review: 0 };
      for (const c of mergedData) {
        if (c.status === 'pending') s.pending++;
        else if (c.status === 'accepted') s.accepted++;
        else if (c.status === 'rejected') s.rejected++;
        else if (c.status === 'in_review') s.review++;
      }
      setStats(s);
    } catch (err) {
      console.error('Error loading checkins:', err);
    }
    setLoading(false);
  }, [online]);

  useEffect(() => {
    loadCheckins();
    const interval = setInterval(loadCheckins, 10000);
    return () => clearInterval(interval);
  }, [loadCheckins]);

  const handleAction = async (checkin, newStatus) => {
    setActionLoading(checkin.localId || checkin.id);
    try {
      const comment = prompt(
        newStatus === 'accepted' ? '✅ Agregar comentario (opcional):' :
        newStatus === 'rejected' ? '❌ Motivo del rechazo:' :
        '🔍 Motivo de la revisión:',
        ''
      );
      if (newStatus === 'rejected' && !comment) { alert('Debes ingresar un motivo.'); setActionLoading(null); return; }
      if (online) {
        try { await updateCheckinStatus(checkin.id || checkin.localId, newStatus, user.name, comment || undefined); }
        catch { await updateLocalCheckinStatus(checkin.localId, newStatus, user.name, comment); await queueStatusChange(checkin.localId, newStatus, user.name, comment); }
      } else {
        await updateLocalCheckinStatus(checkin.localId, newStatus, user.name, comment);
        await queueStatusChange(checkin.localId, newStatus, user.name, comment);
      }
      await loadCheckins();
    } catch (err) { alert('Error: ' + err.message); }
    setActionLoading(null);
  };

  // Separate by source
  const onlineCheckins = checkins.filter(c => c.source !== 'inperson');
  const inpersonCheckins = checkins.filter(c => c.source === 'inperson');

  const filteredList = (activeTab === 'online' ? onlineCheckins : activeTab === 'inperson' ? inpersonCheckins : checkins)
    .filter(c => filter === 'all' || c.status === filter);

  // Export to CSV
  const exportCSV = (list) => {
    const headers = ['Código', 'Viajero', 'RUT', 'Nacionalidad', 'Tipo', 'Paso Fronterizo', 'Aduana', 'Origen', 'Estado', 'Fecha Ingreso', 'Procesado Por', 'Funcionario RUT', 'Paso Asignado', 'Comentario', 'PDI Estado'];
    const rows = list.map(c => [
      (c.localId || c.id || '').slice(0, 8).toUpperCase(),
      c.userName || '',
      c.rut || '',
      c.nationality || '',
      { vehicle: 'Vehículo', minor: 'Menor', pet: 'Mascota', general: 'General' }[c.checkinType] || c.checkinType,
      BORDER_CROSSINGS.find(bc => bc.id === c.borderCrossing)?.name || c.borderCrossing || '',
      BORDER_CROSSINGS.find(bc => bc.id === c.borderCrossing)?.region || '',
      c.source === 'inperson' ? 'Presencial' : 'Online',
      { pending: 'Pendiente', accepted: 'Aprobado', rejected: 'Rechazado', in_review: 'En Revisión' }[c.status] || c.status,
      new Date(c.createdAt).toLocaleString('es-CL'),
      c.processedBy || c.createdBy || '',
      c.rut || '',
      BORDER_CROSSINGS.find(bc => bc.id === c.borderCrossing)?.name || c.borderCrossing || '',
      c.comment || '',
      c.pdiReview?.status === 'cleared' ? 'Autorizado' : c.pdiReview?.status === 'denied' ? 'Denegado' : c.pdiReview?.status === 'flagged' ? 'En Revisión' : 'Pendiente',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `sigce-reporte-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Print / PDF
  const printReport = (list, title) => {
    const w = window.open('', '_blank');
    const rows = list.map(c => `<tr>
      <td>${(c.localId || c.id || '').slice(0, 8).toUpperCase()}</td>
      <td>${c.userName || ''}</td>
      <td>${c.rut || ''}</td>
      <td>${c.nationality || ''}</td>
      <td>${{ vehicle: 'Vehículo', minor: 'Menor', pet: 'Mascota', general: 'General' }[c.checkinType] || c.checkinType}</td>
      <td>${BORDER_CROSSINGS.find(bc => bc.id === c.borderCrossing)?.name || c.borderCrossing || ''}</td>
      <td>${BORDER_CROSSINGS.find(bc => bc.id === c.borderCrossing)?.region || ''}</td>
      <td>${c.source === 'inperson' ? 'Presencial' : 'Online'}</td>
      <td>${{ pending: 'Pendiente', accepted: 'Aprobado', rejected: 'Rechazado', in_review: 'En Revisión' }[c.status] || c.status}</td>
      <td>${new Date(c.createdAt).toLocaleString('es-CL')}</td>
      <td>${c.processedBy || c.createdBy || ''}</td>
      <td>${c.comment || ''}</td>
    </tr>`).join('');
    w.document.write(`
      <html><head><title>Reporte SIGCE</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 20px; }
        h1 { color: #003366; border-bottom: 2px solid #C8A020; padding-bottom: 8px; }
        .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th { background: #003366; color: white; padding: 8px; text-align: left; font-size: 0.8em; }
        td { padding: 6px 8px; border: 1px solid #ddd; font-size: 0.8em; }
        tr:nth-child(even) { background: #f9f9f9; }
        .footer { margin-top: 20px; font-size: 0.8em; color: #999; text-align: center; }
        @media print { @page { size: landscape; } }
      </style></head><body>
      <h1>🛂 Reporte SIGCE — ${title}</h1>
      <div class="meta">Generado: ${new Date().toLocaleString('es-CL')} | Total: ${list.length} trámites</div>
      <table>
        <tr><th>Código</th><th>Viajero</th><th>RUT</th><th>Nacionalidad</th><th>Tipo</th><th>Paso Fronterizo</th><th>Región</th><th>Origen</th><th>Estado</th><th>Fecha</th><th>Funcionario</th></tr>
        ${rows}
      </table>
      <div class="footer">SIGCE — Sistema Integrado de Gestión de Comercio Exterior | Prototipo Evaluación Parcial N°3</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 500);
  };

  const getTypeIcon = (type) => ({ vehicle: '🚗', minor: '👶', pet: '🐾', general: '📋' }[type] || '📋');
  const getTypeLabel = (type) => ({ vehicle: 'Vehículo', minor: 'Menor de Edad', pet: 'Mascota', general: 'General' }[type] || type);
  const formatDate = (dateStr) => { try { return new Date(dateStr).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return dateStr; } };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>👤 Panel de Funcionarios — Aduanas Chile</h2>
        <p>Gestión de check-ins anticipados y trámites presenciales</p>
        {!online && <div className="alert alert-warning">📴 Sin conexión al servidor — modo local</div>}
        <div className="official-actions-bar">
          <button className="btn btn-primary" onClick={() => navigate('/oficial/nuevo')}>📝 Nuevo Trámite Presencial</button>
          <span className="bar-hint">Para viajeros que llegaron sin check-in</span>
          <div className="export-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(filteredList)}>📄 Exportar CSV</button>
            <button className="btn btn-secondary btn-sm" onClick={() => printReport(filteredList, activeTab === 'inperson' ? 'Trámites Presenciales' : activeTab === 'online' ? 'Check-In Online' : 'Todos los Trámites')}>🖨️ Imprimir / PDF</button>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="stats-grid">
        <div className="stat-card pending-stat" onClick={() => setFilter('pending')}>
          <span className="stat-number">{stats.pending}</span><span className="stat-label">Pendientes</span><span className="stat-icon">⏳</span>
        </div>
        <div className="stat-card review-stat" onClick={() => setFilter('in_review')}>
          <span className="stat-number">{stats.review}</span><span className="stat-label">En Revisión</span><span className="stat-icon">🔍</span>
        </div>
        <div className="stat-card accepted-stat" onClick={() => setFilter('accepted')}>
          <span className="stat-number">{stats.accepted}</span><span className="stat-label">Aprobados</span><span className="stat-icon">✅</span>
        </div>
        <div className="stat-card rejected-stat" onClick={() => setFilter('rejected')}>
          <span className="stat-number">{stats.rejected}</span><span className="stat-label">Rechazados</span><span className="stat-icon">❌</span>
        </div>
        <div className="stat-card total-stat" onClick={() => setFilter('all')}>
          <span className="stat-number">{checkins.length}</span><span className="stat-label">Total</span><span className="stat-icon">📊</span>
        </div>
      </div>

      {/* Zones / Tabs */}
      <div className="zone-tabs">
        <button className={`zone-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
          📋 Todos ({checkins.length})
        </button>
        <button className={`zone-tab ${activeTab === 'online' ? 'active' : ''}`} onClick={() => setActiveTab('online')}>
          🌐 Check-In Online ({onlineCheckins.length})
        </button>
        <button className={`zone-tab ${activeTab === 'inperson' ? 'active' : ''}`} onClick={() => setActiveTab('inperson')}>
          📝 Presencial ({inpersonCheckins.length})
        </button>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        {['pending', 'in_review', 'accepted', 'rejected', 'all'].map(f => (
          <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'pending' ? '⏳ Pendientes' : f === 'in_review' ? '🔍 En Revisión' : f === 'accepted' ? '✅ Aprobados' : f === 'rejected' ? '❌ Rechazados' : '📋 Todos'}
          </button>
        ))}
      </div>

      {/* Zone indicator */}
      {activeTab === 'online' && (
        <div className="zone-header zone-online">
          <span className="zone-icon">🌐</span>
          <div><strong>Zona: Check-In Online</strong><p>Trámites realizados por viajeros desde la página web</p></div>
        </div>
      )}
      {activeTab === 'inperson' && (
        <div className="zone-header zone-inperson">
          <span className="zone-icon">📝</span>
          <div><strong>Zona: Trámites Presenciales</strong><p>Trámites registrados por funcionarios para viajeros en el paso fronterizo</p></div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="loading">Cargando trámites...</div>
      ) : filteredList.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">{filter === 'pending' ? '🎉' : '📭'}</span>
          <h3>{filter === 'pending' ? '¡No hay trámites pendientes!' : 'No hay resultados'}</h3>
          <p>Cambia el filtro o crea un nuevo trámite presencial.</p>
        </div>
      ) : (
        <div className="checkins-list official-list">
          {filteredList.map(checkin => (
            <div key={checkin.localId || checkin.id} className={`card checkin-card official-card status-${checkin.status}`}>
              <div className="checkin-card-header">
                <div className="checkin-type-badge">
                  <span>{getTypeIcon(checkin.checkinType)}</span>
                  <span>{getTypeLabel(checkin.checkinType)}</span>
                </div>
                {checkin.source === 'inperson' && <span className="source-badge inperson">📝 Presencial</span>}
                {(!checkin.source || checkin.source === 'online') && <span className="source-badge online">🌐 Online</span>}
                <StatusBadge status={checkin.status} />
                <span className="checkin-date">{formatDate(checkin.createdAt)}</span>
              </div>

              <div className="checkin-card-body" onClick={() => navigate(`/oficial/${checkin.localId || checkin.id}`)} style={{ cursor: 'pointer' }}>
                <div className="checkin-meta">
                  <span className="meta-item"><strong>Viajero:</strong> {checkin.userName || 'Visitante'}</span>
                  <span className="meta-item"><strong>RUT:</strong> {checkin.rut || '—'}</span>
                  <span className="meta-item"><strong>Paso:</strong> {BORDER_CROSSINGS.find(bc => bc.id === checkin.borderCrossing)?.name || checkin.borderCrossing || '—'}</span>
                  <span className="meta-item"><strong>Código:</strong> <code>{(checkin.localId || checkin.id)?.slice(0, 8).toUpperCase()}</code></span>
                </div>
                {checkin.checkinType === 'vehicle' && checkin.details?.patent && (
                  <div className="checkin-detail">🚗 {checkin.details.brand} {checkin.details.model} — <strong>{checkin.details.patent}</strong>{checkin.details.vehicleType === 'diplomatic' && <span className="tag-diplomatic">🚩 Diplomático</span>}</div>
                )}
                {checkin.checkinType === 'minor' && (
                  <div className="checkin-detail">👶 {checkin.details?.minorName || 'Menor'} — {checkin.details?.minorAccompaniedBy === 'both' ? 'Ambos padres' : checkin.details?.minorAccompaniedBy === 'one_parent' ? 'Un progenitor' : 'Sin compañía'}{checkin.details?.hasMinorAuthorization ? ' 📄 Con autorización' : ' ⚠️ Sin autorización'}</div>
                )}
                {checkin.checkinType === 'pet' && (
                  <div className="checkin-detail">🐾 {checkin.details?.petName || 'Mascota'} ({checkin.details?.petType}) — Vacunas: {checkin.details?.petHasVaccines ? '✅' : '❌'}</div>
                )}
                {checkin.comments && <div className="checkin-detail comment">💬 {checkin.comments}</div>}
              </div>

              <div className="checkin-card-hint">
                <span>👆 Haz clic en el trámite para ver detalles y procesarlo</span>
              </div>

              <div className="checkin-card-footer">
                {!checkin.synced && <span className="sync-badge pending">📴 Pendiente de sincronización</span>}
                {checkin.processedBy && <span className="processed-by">👤 {checkin.processedBy}</span>}
                {checkin.comment && <span className="official-comment">📌 {checkin.comment}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OfficialPanel;
