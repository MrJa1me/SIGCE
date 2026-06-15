import React from 'react';

const statusConfig = {
  pending: { label: 'Pendiente', className: 'badge-pending' },
  accepted: { label: '✅ Aprobado', className: 'badge-accepted' },
  rejected: { label: '❌ Rechazado', className: 'badge-rejected' },
  in_review: { label: '🔍 En Revisión', className: 'badge-review' },
};

function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, className: 'badge-pending' };
  return <span className={`status-badge ${config.className}`}>{config.label}</span>;
}

export default StatusBadge;
