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

/**
 * Standardizes any Indian phone number to +91XXXXXXXXXX
 */
export function formatPhone(phone) {
  if (!phone) return null;
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // If 10 digits, add +91
  if (cleaned.length === 10) return `+91${cleaned}`;
  
  // If 12 digits starting with 91, add +
  if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
  
  // Otherwise, if it starts with +91 and has 10 digits after, it's already good
  if (phone.startsWith('+91') && cleaned === phone.slice(1)) return phone;

  return phone; // Return as is if it doesn't match Indian pattern
}

export function isValidPhone(phone) {
  if (!phone) return false;
  const cleaned = formatPhone(phone);
  // Valid Indian phone is +91 followed by 10 digits
  return /^\+91\d{10}$/.test(cleaned);
}

export function getWhatsAppUrl(message) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function getSmsUrl(message) {
  return `sms:?body=${encodeURIComponent(message)}`;
}
