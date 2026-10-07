let deviceSessionToken: string | null = null;

export function getFingerprint() {
  const saved = localStorage.getItem("fingerprint");
  if (saved && /^[0-9a-f]{32}$/.test(saved)) return saved;

  const fingerprint = crypto.randomUUID().replace(/-/g, "");
  localStorage.setItem("fingerprint", fingerprint);
  return fingerprint;
}

export function getDeviceSessionToken() {
  return deviceSessionToken;
}

export function setDeviceSessionToken(token: string) {
  deviceSessionToken = token;
}

export function clearDeviceSession() {
  deviceSessionToken = null;
}
