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

export function formatCheckinCode(checkinId) {
  if (!checkinId) return '—';
  return String(checkinId).slice(0, 8).toUpperCase();
}

const DEFAULT_VALIDITY_DAYS = 30;

export function getValidityDays(checkinType, details = {}) {
  if (checkinType === 'vehicle') return 45;
  if (checkinType === 'minor') return 60;
  if (checkinType === 'pet') return 30;
  return DEFAULT_VALIDITY_DAYS;
}

export function computeValidUntil(createdAt, checkinType, details = {}) {
  if (details?.validUntil) return details.validUntil;
  const created = new Date(createdAt);
  const days = getValidityDays(checkinType, details);
  const until = new Date(created);
  until.setDate(until.getDate() + days);
  return until.toISOString();
}

export function isCheckinExpired(validUntil) {
  if (!validUntil) return false;
  return new Date() > new Date(validUntil);
}

export function formatValidUntil(validUntil) {
  if (!validUntil) return '—';
  return new Date(validUntil).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export async function downloadQrPdf({
  checkinId,
  travelerName,
  crossingName,
  validUntil,
  status,
  qrCanvas,
}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const code = formatCheckinCode(checkinId);

  doc.setFillColor(0, 51, 102);
  doc.rect(0, 0, 148, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('SIGCE — Código de Check-In', 74, 12, { align: 'center' });
  doc.setFontSize(9);
  doc.text('Sistema Integrado de Gestión de Comercio Exterior', 74, 20, { align: 'center' });

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.text(`Código: ${code}`, 14, 38);
  doc.text(`Viajero: ${travelerName || '—'}`, 14, 46);
  if (crossingName) doc.text(`Paso: ${crossingName}`, 14, 54);
  doc.text(`Válido hasta: ${formatValidUntil(validUntil)}`, 14, 62);
  doc.text(`Estado: ${status || 'pending'}`, 14, 70);

  if (qrCanvas) {
    const img = qrCanvas.toDataURL('image/png');
    doc.addImage(img, 'PNG', 44, 78, 60, 60);
  }

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Presenta este documento o el QR en pantalla al llegar al paso fronterizo.', 74, 148, { align: 'center' });
  doc.text(`Generado: ${new Date().toLocaleString('es-CL')}`, 74, 154, { align: 'center' });

  doc.save(`sigce-qr-${code}.pdf`);
}
