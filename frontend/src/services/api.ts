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
