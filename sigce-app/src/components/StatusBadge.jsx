import React from 'react';
import { STATUS_LABELS } from './icons';

const statusConfig = {
  pending: { label: STATUS_LABELS.pending, className: 'badge-pending' },
  accepted: { label: STATUS_LABELS.accepted, className: 'badge-accepted' },
  rejected: { label: STATUS_LABELS.rejected, className: 'badge-rejected' },
  in_review: { label: STATUS_LABELS.in_review, className: 'badge-review' },
};

function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, className: 'badge-pending' };
  return <span className={`status-badge ${config.className}`}>{config.label}</span>;
}

export default StatusBadge;
