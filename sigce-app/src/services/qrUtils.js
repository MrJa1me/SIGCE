export function buildVerifyUrl(checkinId) {
  if (!checkinId) return '';
  return `${window.location.origin}/oficial/verificar/${encodeURIComponent(checkinId)}`;
}

export function parseCheckinIdFromQr(text) {
  if (!text) return null;
  const value = text.trim();

  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/oficial\/verificar\/([^/]+)/i);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // not a URL
  }

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return value;
  }

  if (/^[0-9a-f-]{8,}$/i.test(value)) {
    return value;
  }

  return null;
}

export function formatCheckinCode(checkinId) {
  if (!checkinId) return '—';
  return String(checkinId).slice(0, 8).toUpperCase();
}

export const BORDER_STATUS = {
  accepted: {
    title: 'Autorizado — puede pasar',
    hint: 'El viajero puede continuar el proceso migratorio.',
    className: 'border-status-ok',
    icon: 'check',
  },
  rejected: {
    title: 'Ingreso rechazado',
    hint: 'No autorizar el paso. Derivar a ventanilla.',
    className: 'border-status-denied',
    icon: 'x',
  },
  in_review: {
    title: 'En revisión',
    hint: 'Requiere verificación adicional en ventanilla.',
    className: 'border-status-review',
    icon: 'search',
  },
  pending: {
    title: 'Pendiente de revisión',
    hint: 'El trámite aún no ha sido procesado por un funcionario.',
    className: 'border-status-pending',
    icon: 'clock',
  },
};
