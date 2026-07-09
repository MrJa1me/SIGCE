import React, { useMemo } from 'react';
import { Icon } from './icons';
import { CHECKIN_TYPE_LABELS, ROLE_LABELS, STATUS_LABELS } from './icons';
import { useBorderCrossings } from '../context/BorderCrossingsContext';

const STATUS_COLORS = {
  pending: '#856404',
  in_review: '#0c5460',
  accepted: '#155724',
  rejected: '#721c24',
};

const ROLE_COLORS = {
  admin: '#003366',
  official: '#856404',
  traveler: '#155724',
};

const TYPE_COLORS = {
  vehicle: '#1a5276',
  minor: '#7b241c',
  pet: '#1e8449',
  general: '#5b2c6f',
};

function fillDailySeries(daily, days) {
  const map = Object.fromEntries((daily || []).map((d) => [d.date, d.count]));
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({
      date: key,
      count: map[key] || 0,
      label: d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
    });
  }
  return result;
}

function mapToChartItems(obj, labelMap = {}, colorMap = {}) {
  return Object.entries(obj || {})
    .map(([key, value]) => ({
      key,
      label: labelMap[key] || key,
      value,
      color: colorMap[key],
    }))
    .sort((a, b) => b.value - a.value);
}

function DonutChart({ segments, size = 140 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 36;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="donut-chart-wrap">
      <svg viewBox="0 0 100 100" width={size} height={size} className="donut-chart-svg">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="14" />
        {segments.map((seg) => {
          const dash = (seg.value / total) * c;
          const el = (
            <circle
              key={seg.key}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${c}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="donut-chart-center">
        <strong>{total}</strong>
        <span>total</span>
      </div>
    </div>
  );
}

function BarChart({ items, color = 'var(--primary)' }) {
  const max = Math.max(...items.map((d) => d.value), 1);
  return (
    <div className="bar-chart">
      {items.map((d) => (
        <div key={d.key} className="bar-chart-row">
          <span className="bar-chart-label" title={d.label}>{d.label}</span>
          <div className="bar-chart-track">
            <div
              className="bar-chart-fill"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color || color }}
            />
          </div>
          <span className="bar-chart-value">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function ColumnChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="column-chart">
      {data.map((d) => (
        <div key={d.date} className="column-chart-item" title={`${d.count} trámites`}>
          <span className="column-chart-count">{d.count > 0 ? d.count : ''}</span>
          <div className="column-chart-bar-wrap">
            <div
              className="column-chart-bar"
              style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 0)}%` }}
            />
          </div>
          <span className="column-chart-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, icon, children, legend }) {
  return (
    <div className="card admin-chart-card">
      <h3 className="admin-chart-title">
        {icon && <Icon name={icon} size="sm" />}
        {title}
      </h3>
      <div className="admin-chart-body">{children}</div>
      {legend && <div className="chart-legend">{legend}</div>}
    </div>
  );
}

function AdminDashboard({ stats, loading, error }) {
  const { getBorderCrossing } = useBorderCrossings();
  const periodDays = stats?.periodDays || 14;

  const formatCrossingLabel = (id) => {
    if (!id || id === 'sin-paso') return 'Sin paso';
    const bc = getBorderCrossing(id);
    if (bc) return bc.shortName;
    return id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const checkinsDaily = useMemo(
    () => fillDailySeries(stats?.checkins?.daily, periodDays),
    [stats, periodDays]
  );

  const usersDaily = useMemo(
    () => fillDailySeries(stats?.users?.daily, periodDays),
    [stats, periodDays]
  );

  const statusItems = useMemo(
    () => mapToChartItems(stats?.checkins?.byStatus, STATUS_LABELS, STATUS_COLORS),
    [stats]
  );

  const roleItems = useMemo(
    () => mapToChartItems(stats?.users?.byRole, ROLE_LABELS, ROLE_COLORS),
    [stats]
  );

  const typeItems = useMemo(
    () => mapToChartItems(stats?.checkins?.byType, CHECKIN_TYPE_LABELS, TYPE_COLORS),
    [stats]
  );

  const crossingItems = useMemo(
    () => Object.entries(stats?.checkins?.byCrossing || {}).map(([key, value]) => ({
      key,
      label: formatCrossingLabel(key),
      value,
      color: getBorderCrossing(key)?.color || 'var(--primary)',
    })).sort((a, b) => b.value - a.value),
    [stats, getBorderCrossing]
  );

  const nationalityItems = useMemo(
    () => Object.entries(stats?.checkins?.byNationality || {}).map(([key, value]) => ({
      key,
      label: key,
      value,
    })).sort((a, b) => b.value - a.value),
    [stats]
  );

  if (loading) {
    return <div className="loading admin-dashboard-loading">Cargando estadísticas...</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!stats) return null;

  const { users, checkins, documents, summary } = stats;

  return (
    <section className="admin-dashboard">
      <div className="admin-section-header">
        <h3 className="page-title-with-icon">
          <Icon name="clipboard" size="sm" /> Resumen del Sistema
        </h3>
        <p className="admin-section-sub">
          Últimos {periodDays} días · actualizado {new Date(stats.generatedAt).toLocaleString('es-CL')}
        </p>
      </div>

      <div className="stats-grid admin-kpi-grid">
        <div className="stat-card total-stat">
          <span className="stat-number">{checkins.total}</span>
          <span className="stat-label">Trámites totales</span>
          <span className="stat-icon"><Icon name="clipboard" size="md" /></span>
        </div>
        <div className="stat-card review-stat">
          <span className="stat-number">{checkins.today}</span>
          <span className="stat-label">Hoy</span>
          <span className="stat-icon"><Icon name="clock" size="md" /></span>
        </div>
        <div className="stat-card pending-stat">
          <span className="stat-number">{summary.pendingCount}</span>
          <span className="stat-label">Pendientes / en revisión</span>
          <span className="stat-icon"><Icon name="search" size="md" /></span>
        </div>
        <div className="stat-card accepted-stat">
          <span className="stat-number">{summary.acceptanceRate}%</span>
          <span className="stat-label">Tasa de aprobación</span>
          <span className="stat-icon"><Icon name="check" size="md" /></span>
        </div>
        <div className="stat-card total-stat">
          <span className="stat-number">{users.total}</span>
          <span className="stat-label">Usuarios registrados</span>
          <span className="stat-icon"><Icon name="userPlus" size="md" /></span>
        </div>
        <div className="stat-card review-stat">
          <span className="stat-number">{checkins.thisWeek}</span>
          <span className="stat-label">Trámites esta semana</span>
          <span className="stat-icon"><Icon name="globe" size="md" /></span>
        </div>
        <div className="stat-card accepted-stat">
          <span className="stat-number">{documents.total}</span>
          <span className="stat-label">Documentos adjuntos</span>
          <span className="stat-icon"><Icon name="file" size="md" /></span>
        </div>
        <div className="stat-card pending-stat">
          <span className="stat-number">{summary.avgProcessingHours}h</span>
          <span className="stat-label">Tiempo prom. de resolución</span>
          <span className="stat-icon"><Icon name="clock" size="md" /></span>
        </div>
      </div>

      <div className="admin-charts-grid">
        <ChartCard title="Actividad de trámites" icon="clipboard">
          <ColumnChart data={checkinsDaily} />
        </ChartCard>

        <ChartCard
          title="Estado de trámites"
          icon="check"
          legend={statusItems.map((s) => (
            <span key={s.key} className="legend-item">
              <span className="legend-dot" style={{ background: s.color }} />
              {s.label}: {s.value}
            </span>
          ))}
        >
          <div className="donut-chart-layout">
            <DonutChart segments={statusItems} />
          </div>
        </ChartCard>

        <ChartCard title="Usuarios por rol" icon="user">
          <BarChart items={roleItems} />
        </ChartCard>

        <ChartCard title="Trámites por tipo" icon="vehicle">
          <BarChart items={typeItems} />
        </ChartCard>

        <ChartCard title="Trámites por paso fronterizo" icon="globe">
          <BarChart items={crossingItems} />
        </ChartCard>

        <ChartCard title="Nacionalidad de viajeros" icon="traveler">
          <BarChart items={nationalityItems} color="#2c3e50" />
        </ChartCard>

        {usersDaily.some((d) => d.count > 0) && (
          <ChartCard title="Registro de usuarios" icon="userPlus">
            <ColumnChart data={usersDaily} />
          </ChartCard>
        )}
      </div>
    </section>
  );
}

export default AdminDashboard;
