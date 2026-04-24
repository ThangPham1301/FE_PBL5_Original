export function isEmpty(value) {
  return value == null || String(value).trim() === '';
}

export function isValidIsoDate(value) {
  if (isEmpty(value)) {
    return false;
  }
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return date.toISOString().slice(0, 10) === text;
}

export function isPositiveInteger(value) {
  if (isEmpty(value)) {
    return false;
  }
  return /^\d+$/.test(String(value).trim()) && Number(value) > 0;
}

export function minLength(value, length) {
  return !isEmpty(value) && String(value).trim().length >= length;
}

export function validateRequired(fieldMap) {
  const entries = Object.entries(fieldMap);
  const firstMissing = entries.find(([, value]) => isEmpty(value));
  return firstMissing ? `${firstMissing[0]} là bắt buộc.` : null;
}
