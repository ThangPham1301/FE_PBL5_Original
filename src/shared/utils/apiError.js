function findFirstMessage(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = findFirstMessage(item);
      if (message) {
        return message;
      }
    }
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      const message = findFirstMessage(item);
      if (message) {
        return message;
      }
    }
  }
  return null;
}

export function getApiErrorMessage(error, fallbackMessage = 'Đã xảy ra lỗi.') {
  const responseData = error?.response?.data;
  if (typeof responseData?.message === 'string' && responseData.message.trim()) {
    return responseData.message.trim();
  }
  if (typeof responseData?.detail === 'string' && responseData.detail.trim()) {
    return responseData.detail.trim();
  }

  const nestedMessage = findFirstMessage(responseData?.data || responseData);
  if (nestedMessage) {
    return nestedMessage;
  }
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }
  return fallbackMessage;
}
