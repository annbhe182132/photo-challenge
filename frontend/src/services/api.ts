const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://photo-challenge-ptng.onrender.com')
).replace(/\/+$/, '');

export const apiRequest = async <T>(path: string, options?: RequestInit): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new Error('Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.');
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại sau.');
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'message' in data
      ? (data as { message?: unknown }).message
      : undefined;
    if (typeof message === 'string' && message.trim()) throw new Error(message);
    if (response.status === 404) throw new Error('Không tìm thấy dữ liệu tương ứng với mã QR này.');
    throw new Error('Máy chủ không thể xử lý yêu cầu. Vui lòng thử lại sau.');
  }

  return data as T;
};

export const playerApiRequest = <T>(
  playerToken: string | null,
  path: string,
  options?: RequestInit,
): Promise<T> => {
  if (!playerToken) return Promise.reject(new Error('Phiên người chơi đã hết hạn. Hãy tham gia lại phòng.'));
  const headers = new Headers(options?.headers);
  headers.set('X-Player-Token', playerToken);
  return apiRequest<T>(path, { ...options, headers });
};


/** Sends a best-effort authenticated request that can finish while the document is closing. */
export const sendPlayerBeacon = (
  playerToken: string | null,
  path: string,
  body: Record<string, string | number>,
): boolean => {
  if (!playerToken || typeof navigator === 'undefined') {
    return false;
  }

  const payload = new URLSearchParams({
    ...Object.fromEntries(Object.entries(body).map(([key, value]) => [key, String(value)])),
    playerToken,
  });
  try {
    if (typeof navigator.sendBeacon === 'function') {
      const queued = navigator.sendBeacon(`${API_BASE_URL}${path}`, payload);
      if (queued) return true;
    }
  } catch {
    // Fall through to a keepalive request below.
  }

  // Some browsers refuse a beacon when the page is closing. Keepalive fetch is the fallback.
  void fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Player-Token': playerToken,
    },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
  return false;
};
