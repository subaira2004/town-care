export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getTodayDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function calculateEstimatedWait(tokenNumber, currentToken, avgMinutes, delayMinutes = 0) {
  if (!currentToken || !tokenNumber) return 0;
  const position = tokenNumber - currentToken;
  if (position <= 0) return 0;
  return position * avgMinutes + delayMinutes;
}

export function getCurrentToken(tokens) {
  const inConsultation = tokens.find((t) => t.status === 'in_consultation');
  if (inConsultation) return inConsultation.token_number;
  const waitingTokens = tokens
    .filter((t) => t.status === 'waiting')
    .sort((a, b) => a.token_number - b.token_number);
  if (waitingTokens.length > 0) return waitingTokens[0].token_number;
  const completedTokens = tokens
    .filter((t) => t.status === 'completed')
    .sort((a, b) => b.token_number - a.token_number);
  if (completedTokens.length > 0) return completedTokens[0].token_number;
  return 0;
}

export function getNextWaitingToken(tokens) {
  return tokens
    .filter((t) => t.status === 'waiting')
    .sort((a, b) => a.token_number - b.token_number)[0];
}

export function generateStatusUrl(tokenId) {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/status/${tokenId}`;
  }
  return `/status/${tokenId}`;
}

export function getWhatsAppUrl(message) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function getSmsUrl(message) {
  return `sms:?body=${encodeURIComponent(message)}`;
}
