import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { getLocalCheckins, updateLocalCheckinStatus, queueStatusChange } from '../services/offlineDb';
import { getPendingCheckins, getCheckins, updateCheckinStatus } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { useBorderCrossings } from '../context/BorderCrossingsContext';
import { Icon, CheckinTypeIcon, checkinTypeLabel, yesNo, PDI_STATUS_LABELS } from '../components/icons';

function OfficialPanel() {
  const { user, online } = useAuth();
  const { crossings, resolveCrossingName, getBorderCrossing } = useBorderCrossings();
  const navigate = useNavigate();
  const assignedCrossing = user?.assignedBorderCrossing;
  const [checkins, setCheckins] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [crossingFilter, setCrossingFilter] = useState('all');
  const [onlyMyCrossing, setOnlyMyCrossing] = useState(!!assignedCrossing);
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
      const onlineOnly = mergedData.filter(c => c.source !== 'inperson');
      setCheckins(onlineOnly);
      const s = { pending: 0, accepted: 0, rejected: 0, review: 0 };
      for (const c of onlineOnly) {
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
        newStatus === 'accepted' ? 'Agregar comentario (opcional):' :
        newStatus === 'rejected' ? 'Motivo del rechazo:' :
        'Motivo de la revisión:',
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

  const filteredList = checkins
    .filter((c) => filter === 'all' || c.status === filter)
    .filter((c) => {
      const crossing = c.borderCrossing || c.border_crossing;
      if (onlyMyCrossing && assignedCrossing) return crossing === assignedCrossing;
      if (crossingFilter !== 'all') return crossing === crossingFilter;
      return true;
    });

  const exportCSV = (list) => {
    const headers = ['Código', 'Viajero', 'RUT', 'Nacionalidad', 'Tipo', 'Paso Fronterizo', 'Aduana', 'Origen', 'Estado', 'Fecha Ingreso', 'Procesado Por', 'Funcionario RUT', 'Paso Asignado', 'Comentario', 'PDI Estado'];
    const rows = list.map(c => [
      (c.localId || c.id || '').slice(0, 8).toUpperCase(),
      c.userName || '',
      c.rut || '',
      c.nationality || '',
      checkinTypeLabel(c.checkinType),
      resolveCrossingName(c.borderCrossing),
      getBorderCrossing(c.borderCrossing)?.region || '',
      'Online',
      { pending: 'Pendiente', accepted: 'Aprobado', rejected: 'Rechazado', in_review: 'En Revisión' }[c.status] || c.status,
      new Date(c.createdAt).toLocaleString('es-CL'),
      c.processedBy || c.createdBy || '',
      c.rut || '',
      resolveCrossingName(c.borderCrossing),
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

  const printReport = (list, title) => {
    const w = window.open('', '_blank');
    const rows = list.map(c => `<tr>
      <td>${(c.localId || c.id || '').slice(0, 8).toUpperCase()}</td>
      <td>${c.userName || ''}</td>
      <td>${c.rut || ''}</td>
      <td>${c.nationality || ''}</td>
      <td>${checkinTypeLabel(c.checkinType)}</td>
      <td>${resolveCrossingName(c.borderCrossing)}</td>
      <td>${getBorderCrossing(c.borderCrossing)?.region || ''}</td>
      <td>Online</td>
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
      <h1>Reporte SIGCE — ${title}</h1>
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

  const formatDate = (dateStr) => { try { return new Date(dateStr).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return dateStr; } };

  const filterLabels = {
    pending: 'Pendientes',
    in_review: 'En Revisión',
    accepted: 'Aprobados',
    rejected: 'Rechazados',
    all: 'Todos',
  };

  const pdiBadgeLabel = (status) => {
    if (status === 'cleared') return `PDI: ${PDI_STATUS_LABELS.cleared}`;
    if (status === 'denied') return `PDI: ${PDI_STATUS_LABELS.denied}`;
    return `PDI: ${PDI_STATUS_LABELS.flagged}`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title-with-icon">
          <Icon name="user" size="md" /> Panel de Funcionarios — Aduanas Chile
        </h2>
        <p>Gestión de check-ins anticipados enviados por viajeros</p>
        {!online && (
          <div className="alert alert-warning">
            Sin conexión al servidor — modo local
          </div>
        )}
        <div className="official-actions-bar">
          <button className="btn btn-primary" onClick={() => navigate('/oficial/escanear')}>
            <Icon name="qr" size="sm" /> Control Fronterizo (QR)
          </button>
          {assignedCrossing && (
            <label className="official-only-mine">
              <input
                type="checkbox"
                checked={onlyMyCrossing}
                onChange={(e) => {
                  setOnlyMyCrossing(e.target.checked);
                  if (e.target.checked) setCrossingFilter('all');
                }}
              />
              Solo mi aduana ({resolveCrossingName(assignedCrossing)})
            </label>
          )}
          <div className="form-group official-crossing-filter">
            <label htmlFor="crossing-filter">Paso fronterizo</label>
            <select
              id="crossing-filter"
              value={onlyMyCrossing ? 'all' : crossingFilter}
              disabled={onlyMyCrossing}
              onChange={(e) => setCrossingFilter(e.target.value)}
            >
              <option value="all">Todos los pasos</option>
              {crossings.map((bc) => (
                <option key={bc.id} value={bc.id}>{bc.name}</option>
              ))}
            </select>
          </div>
          <div className="export-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(filteredList)}>
              Exportar CSV
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => printReport(filteredList, 'Check-Ins Anticipados')}>
              Imprimir / PDF
            </button>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card pending-stat" onClick={() => setFilter('pending')}>
          <span className="stat-number">{stats.pending}</span>
          <span className="stat-label">Pendientes</span>
          <span className="stat-icon"><Icon name="clock" size="md" /></span>
        </div>
        <div className="stat-card review-stat" onClick={() => setFilter('in_review')}>
          <span className="stat-number">{stats.review}</span>
          <span className="stat-label">En Revisión</span>
          <span className="stat-icon"><Icon name="search" size="md" /></span>
        </div>
        <div className="stat-card accepted-stat" onClick={() => setFilter('accepted')}>
          <span className="stat-number">{stats.accepted}</span>
          <span className="stat-label">Aprobados</span>
          <span className="stat-icon"><Icon name="check" size="md" /></span>
        </div>
        <div className="stat-card rejected-stat" onClick={() => setFilter('rejected')}>
          <span className="stat-number">{stats.rejected}</span>
          <span className="stat-label">Rechazados</span>
          <span className="stat-icon"><Icon name="x" size="md" /></span>
        </div>
        <div className="stat-card total-stat" onClick={() => setFilter('all')}>
          <span className="stat-number">{checkins.length}</span>
          <span className="stat-label">Total</span>
          <span className="stat-icon"><Icon name="clipboard" size="md" /></span>
        </div>
      </div>

      <div className="zone-header zone-online">
        <span className="zone-icon"><Icon name="globe" size="lg" /></span>
        <div><strong>Check-ins anticipados</strong><p>Trámites realizados por viajeros desde la web antes de llegar al paso fronterizo</p></div>
      </div>

      <div className="filter-tabs">
        {['pending', 'in_review', 'accepted', 'rejected', 'all'].map(f => (
          <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Cargando trámites...</div>
      ) : filteredList.length === 0 ? (
        <div className="card empty-state">
          <Icon name={filter === 'pending' ? 'check' : 'inbox'} size="xl" className="empty-icon-svg" />
          <h3>{filter === 'pending' ? '¡No hay trámites pendientes!' : 'No hay resultados'}</h3>
          <p>Cambia el filtro para ver otros trámites.</p>
        </div>
      ) : (
        <div className="checkins-list official-list">
          {filteredList.map(checkin => (
            <div key={checkin.localId || checkin.id} className={`card checkin-card official-card status-${checkin.status}`}>
              <div className="checkin-card-header">
                <div className="checkin-type-badge">
                  <CheckinTypeIcon type={checkin.checkinType} size="sm" />
                  <span>{checkinTypeLabel(checkin.checkinType)}</span>
                </div>
                <span className="source-badge online">Online</span>
                <StatusBadge status={checkin.status} />
                <span className="checkin-date">{formatDate(checkin.createdAt)}</span>
              </div>

              <div className="checkin-card-body" onClick={() => navigate(`/oficial/${checkin.localId || checkin.id}`)} style={{ cursor: 'pointer' }}>
                <div className="checkin-meta">
                  <span className="meta-item"><strong>Viajero:</strong> {checkin.userName || 'Visitante'}</span>
                  <span className="meta-item"><strong>RUT:</strong> {checkin.rut || '—'}</span>
                  <span className="meta-item"><strong>Paso:</strong> {resolveCrossingName(checkin.borderCrossing)}</span>
                  <span className="meta-item"><strong>Código:</strong> <code>{(checkin.localId || checkin.id)?.slice(0, 8).toUpperCase()}</code></span>
                </div>
                {checkin.checkinType === 'vehicle' && checkin.details?.patent && (
                  <div className="checkin-detail">
                    {checkin.details.brand} {checkin.details.model} — <strong>{checkin.details.patent}</strong>
                    {checkin.details.vehicleType === 'diplomatic' && (
                      <span className="tag-diplomatic">Diplomático</span>
                    )}
                  </div>
                )}
                {checkin.checkinType === 'minor' && (
                  <div className="checkin-detail">
                    {checkin.details?.minorName || 'Menor'} — {checkin.details?.minorAccompaniedBy === 'both' ? 'Ambos padres' : checkin.details?.minorAccompaniedBy === 'one_parent' ? 'Un progenitor' : 'Sin compañía'}
                    {checkin.details?.hasMinorAuthorization ? ' — Con autorización' : ' — Sin autorización'}
                  </div>
                )}
                {checkin.checkinType === 'pet' && (
                  <div className="checkin-detail">
                    {checkin.details?.petName || 'Mascota'} ({checkin.details?.petType}) — Vacunas: {yesNo(checkin.details?.petHasVaccines)}
                  </div>
                )}
                {checkin.checkinType === 'general' && (
                  <div className="checkin-detail">
                    {checkin.details?.description || checkin.comments || 'Trámite general'}
                  </div>
                )}
                {checkin.comments && checkin.checkinType !== 'general' && (
                  <div className="checkin-detail comment">{checkin.comments}</div>
                )}
              </div>

              <div className="checkin-card-hint">
                <span>Haz clic en el trámite para ver detalles y procesarlo</span>
              </div>

              <div className="checkin-card-footer">
                {!checkin.synced && <span className="sync-badge pending">Pendiente de sincronización</span>}
                {checkin.processedBy && <span className="processed-by">{checkin.processedBy}</span>}
                {checkin.comment && <span className="official-comment">{checkin.comment}</span>}
                {checkin.pdiReview?.status && (
                  <span className={`pdi-badge pdi-${checkin.pdiReview.status}`}>
                    {pdiBadgeLabel(checkin.pdiReview.status)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OfficialPanel;
