import React from 'react';

const PATHS = {
  logo: (
    <>
      <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  traveler: (
    <>
      <rect x="4" y="7" width="16" height="13" rx="2" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
  admin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4h6v3H9z" />
      <path d="M9 11h6M9 15h6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: (
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 7 7 0 1 0 20 14.5z" />
  ),
  vehicle: (
    <>
      <path d="M5 17h14M6 17l1-5h10l1 5" />
      <path d="M7 12l1.5-4h7L17 12" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
    </>
  ),
  minor: (
    <>
      <circle cx="9" cy="8" r="2.5" />
      <circle cx="16" cy="10" r="2" />
      <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
      <path d="M14 20c0-2 1.5-3.5 4-3.5" />
    </>
  ),
  pet: (
    <>
      <circle cx="8" cy="9" r="2" />
      <circle cx="16" cy="9" r="2" />
      <circle cx="5" cy="13" r="1.5" />
      <circle cx="19" cy="13" r="1.5" />
      <path d="M12 11c-2 0-4 2-4 5h8c0-3-2-5-4-5z" />
    </>
  ),
  general: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  check: <path d="M5 12l4 4L19 6" />,
  x: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l5 5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  offline: (
    <>
      <path d="M2 12h4M18 12h4" />
      <path d="M12 2v4M12 18v4" />
      <path d="M5 5l2.5 2.5M16.5 16.5L19 19M5 19l2.5-2.5M16.5 7.5L19 5" />
    </>
  ),
  online: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </>
  ),
  comment: (
    <path d="M4 5h16v11H8l-4 4V5z" />
  ),
  inbox: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 9l9 6 9-6" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M14 6l4 4" />
    </>
  ),
  printer: (
    <>
      <path d="M7 8V4h10v4" />
      <rect x="5" y="12" width="14" height="8" />
      <rect x="7" y="8" width="10" height="5" rx="1" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  flag: <path d="M6 4v16M6 4h10l-2 4 2 4H6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  shield: (
    <>
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3L2 20h20L12 3z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  save: (
    <>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M9 4v6h6V4" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 2.5-5 6-5" />
      <path d="M16 11v6M13 14h6" />
    </>
  ),
};

const SIZES = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 28,
  xl: 40,
};

export function Icon({ name, size = 'md', className = '', strokeWidth = 1.75, title }) {
  const paths = PATHS[name];
  if (!paths) return null;
  const px = SIZES[size] || SIZES.md;
  return (
    <svg
      className={`ui-icon ui-icon-${size} ${className}`.trim()}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {paths}
    </svg>
  );
}

export const CHECKIN_TYPE_LABELS = {
  vehicle: 'Vehículo',
  minor: 'Menor de Edad',
  pet: 'Mascota',
  general: 'General',
};

export const CHECKIN_TYPE_TITLES = {
  vehicle: 'Trámite Vehicular',
  minor: 'Trámite Menor de Edad',
  pet: 'Trámite Mascota',
  general: 'Trámite General',
};

export const ROLE_LABELS = {
  admin: 'Administrador',
  official: 'Funcionario',
  traveler: 'Viajero',
};

export const STATUS_LABELS = {
  pending: 'Pendiente',
  accepted: 'Aprobado',
  rejected: 'Rechazado',
  in_review: 'En Revisión',
};

export const PDI_STATUS_LABELS = {
  cleared: 'Ingreso autorizado',
  flagged: 'En revisión',
  denied: 'Ingreso denegado',
};

export function CheckinTypeIcon({ type, size = 'md', className }) {
  const iconMap = { vehicle: 'vehicle', minor: 'minor', pet: 'pet', general: 'general' };
  return <Icon name={iconMap[type] || 'general'} size={size} className={className} />;
}

export function checkinTypeLabel(type) {
  return CHECKIN_TYPE_LABELS[type] || type;
}

export function checkinTypeTitle(type) {
  return CHECKIN_TYPE_TITLES[type] || 'Trámite';
}

export function yesNo(value) {
  return value ? 'Sí' : 'No';
}

export function roleIconName(role) {
  if (role === 'admin') return 'admin';
  if (role === 'official') return 'user';
  return 'traveler';
}
