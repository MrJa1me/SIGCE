const DEFAULT_VALIDITY_DAYS = 30;

function getValidityDays(checkinType, details = {}) {
  if (checkinType === 'vehicle') return 45;
  if (checkinType === 'minor') return 60;
  if (checkinType === 'pet') return 30;
  if (details?.validityDays) return Number(details.validityDays) || DEFAULT_VALIDITY_DAYS;
  return DEFAULT_VALIDITY_DAYS;
}

function computeValidUntil(createdAt, checkinType, details = {}) {
  const created = new Date(createdAt);
  const days = getValidityDays(checkinType, details);
  const until = new Date(created);
  until.setDate(until.getDate() + days);
  return until.toISOString();
}

function isCheckinExpired(validUntil) {
  if (!validUntil) return false;
  return new Date() > new Date(validUntil);
}

function resolveValidUntil(row) {
  if (row.details?.validUntil) return row.details.validUntil;
  return computeValidUntil(row.created_at || row.createdAt, row.checkin_type || row.checkinType, row.details);
}

module.exports = {
  DEFAULT_VALIDITY_DAYS,
  getValidityDays,
  computeValidUntil,
  isCheckinExpired,
  resolveValidUntil,
};
