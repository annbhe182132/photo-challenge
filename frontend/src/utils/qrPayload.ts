import type { PhysicalCard } from '../data/gameData';

export type QRCodePayload =
  | { type: 'room'; code: string }
  | { type: 'card'; code: string };

const ROOM_CODE_PATTERN = /^ROOM-[A-Z0-9]{4,12}$/i;

/**
 * Chuẩn hóa mọi định dạng mã lá bài:
 * - SD-CARD-001, PC-CARD-001, SD-CARD-1, PC-CARD-1
 * - CARD-001, CARD-01, CARD-1
 * - SD-001, SD-01, SD-1, PC-001, PC-01, PC-1, SD01, PC01
 * - 1..24, 01..24, 001..024
 */
export const normalizeCardCode = (rawInput?: string | null): string | null => {
  if (!rawInput) return null;
  const raw = rawInput.trim().toUpperCase();

  // 1. Dạng chuẩn SD-CARD-xxx hoặc PC-CARD-xxx
  const m1 = raw.match(/^(?:SD|PC)-CARD-0*(\d{1,3})$/);
  if (m1) {
    const num = parseInt(m1[1], 10);
    if (num >= 1 && num <= 24) {
      return `SD-CARD-${String(num).padStart(3, '0')}`;
    }
  }

  // 2. Dạng CARD-xxx
  const m2 = raw.match(/^CARD-0*(\d{1,3})$/);
  if (m2) {
    const num = parseInt(m2[1], 10);
    if (num >= 1 && num <= 24) {
      return `SD-CARD-${String(num).padStart(3, '0')}`;
    }
  }

  // 3. Dạng SD-xx, PC-xx, SDxx, PCxx
  const m3 = raw.match(/^(?:SD|PC)-?0*(\d{1,3})$/);
  if (m3) {
    const num = parseInt(m3[1], 10);
    if (num >= 1 && num <= 24) {
      return `SD-CARD-${String(num).padStart(3, '0')}`;
    }
  }

  // 4. Số nguyên thuần túy từ 1 đến 24 (ví dụ bốc số 1, 01, 24)
  const m4 = raw.match(/^0*(\d{1,2})$/);
  if (m4) {
    const num = parseInt(m4[1], 10);
    if (num >= 1 && num <= 24) {
      return `SD-CARD-${String(num).padStart(3, '0')}`;
    }
  }

  return null;
};

const parseTypedPayload = (value: string): QRCodePayload | null => {
  const match = value.match(/^(?:SNAPDECK|PHOTO-CHALLENGE):(ROOM|CARD):(.+)$/i);
  if (!match) return null;

  const rawCode = match[2].trim().toUpperCase();
  if (match[1].toUpperCase() === 'ROOM' && ROOM_CODE_PATTERN.test(rawCode)) {
    return { type: 'room', code: rawCode };
  }
  const normalizedCard = normalizeCardCode(rawCode);
  if (match[1].toUpperCase() === 'CARD' && normalizedCard) {
    return { type: 'card', code: normalizedCard };
  }
  return null;
};

export const parseQRCodePayload = (rawValue: string): QRCodePayload | null => {
  const value = rawValue.trim();
  const typedPayload = parseTypedPayload(value);
  if (typedPayload) return typedPayload;

  const normalized = value.toUpperCase();
  if (ROOM_CODE_PATTERN.test(normalized)) return { type: 'room', code: normalized };

  const directCard = normalizeCardCode(normalized);
  if (directCard) return { type: 'card', code: directCard };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    // Nếu không phải URL hoàn chỉnh, thử trích xuất mã card hoặc room từ chuỗi bất kỳ
    const subMatch = normalized.match(/(?:CARDCODE|CARD|C)=([^&#]+)/i);
    if (subMatch) {
      const extractedCard = normalizeCardCode(subMatch[1]);
      if (extractedCard) return { type: 'card', code: extractedCard };
    }
    const roomMatch = normalized.match(/ROOM-[A-Z0-9]{4,12}/i);
    if (roomMatch) return { type: 'room', code: roomMatch[0].toUpperCase() };
    return null;
  }

  // Quét các query parameters thông dụng (cardCode, card, c, code, id)
  const hashQuery = url.hash.includes('?') ? new URLSearchParams(url.hash.slice(url.hash.indexOf('?') + 1)) : null;

  const roomKeys = ['roomCode', 'room', 'r'];
  for (const key of roomKeys) {
    const candidate = url.searchParams.get(key) ?? hashQuery?.get(key);
    if (candidate && ROOM_CODE_PATTERN.test(candidate.toUpperCase())) {
      return { type: 'room', code: candidate.toUpperCase() };
    }
  }

  const cardKeys = ['cardCode', 'card', 'c', 'code', 'id'];
  for (const key of cardKeys) {
    const candidate = url.searchParams.get(key) ?? hashQuery?.get(key);
    if (candidate) {
      const normalizedCard = normalizeCardCode(candidate);
      if (normalizedCard) return { type: 'card', code: normalizedCard };
    }
  }

  const paths = [url.pathname];
  if (url.hash.startsWith('#/')) paths.push(url.hash.slice(1).split('?')[0]);

  for (const path of paths) {
    const segments = path.split('/').filter(Boolean).map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
    const upperSegments = segments.map((segment) => segment.toUpperCase());

    for (let index = 0; index < upperSegments.length; index += 1) {
      const segment = upperSegments[index];
      // Kiểm tra trực tiếp segment có phải card code không
      const cardFromSegment = normalizeCardCode(segment);
      if (cardFromSegment) {
        return { type: 'card', code: cardFromSegment };
      }

      if (ROOM_CODE_PATTERN.test(segment)) {
        return { type: 'room', code: segment };
      }

      if (index < upperSegments.length - 1) {
        const marker = segment;
        const code = upperSegments[index + 1];
        if (['ROOM', 'ROOMS', 'JOIN'].includes(marker) && ROOM_CODE_PATTERN.test(code)) {
          return { type: 'room', code };
        }
        if (['CARD', 'CARDS', 'QR'].includes(marker)) {
          const nextCard = normalizeCardCode(code);
          if (nextCard) return { type: 'card', code: nextCard };
        }
      }
    }
  }

  return null;
};

export const BOX_QR_VALUE = 'https://annbhe182132.github.io/photo-challenge/';
export const roomQrValue = (roomCode: string) => `SNAPDECK:ROOM:${roomCode.toUpperCase()}`;
export const cardQrValue = (cardCode: string) => `https://annbhe182132.github.io/photo-challenge/#/scan?cardCode=${encodeURIComponent(cardCode.toUpperCase())}`;

export const downloadBoxQrCleanSvg = async () => {
  const { default: QRCode } = await import('qrcode');
  const svg = await QRCode.toString(BOX_QR_VALUE, {
    type: 'svg',
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'snapdeck-box-qr.svg';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadBoxQrPng = async () => {
  const { default: QRCode } = await import('qrcode');
  const dataUrl = await QRCode.toDataURL(BOX_QR_VALUE, {
    width: 2400,
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'snapdeck-box-qr.png';
  link.click();
};

export const downloadBoxQrBadge = async () => {
  const { default: QRCode } = await import('qrcode');
  const cleanSvg = await QRCode.toString(BOX_QR_VALUE, {
    type: 'svg',
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
  const viewBoxMatch = cleanSvg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 33 33';
  const qrInner = cleanSvg.slice(cleanSvg.indexOf('>') + 1, cleanSvg.lastIndexOf('</svg>'));

  const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
  </defs>
  <rect width="600" height="750" rx="36" fill="url(#bgGrad)" stroke="#0284c7" stroke-width="6"/>
  <rect x="16" y="16" width="568" height="718" rx="24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="8 8"/>
  <rect x="70" y="40" width="460" height="52" rx="26" fill="#0f172a"/>
  <text x="300" y="73" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="20" font-weight="900" fill="#38bdf8" text-anchor="middle" letter-spacing="3">SNAPDECK</text>
  <text x="300" y="132" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="26" font-weight="900" fill="#0f172a" text-anchor="middle">QUÉT MÃ VÀO WEB APP CHƠI NGAY</text>
  <text x="300" y="162" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="600" fill="#64748b" text-anchor="middle">Board Game Phygital với Trọng tài AI & Bình chọn nhóm</text>
  <rect x="90" y="185" width="420" height="420" rx="28" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
  <svg x="110" y="205" width="380" height="380" viewBox="${viewBox}">
    ${qrInner}
  </svg>
  <text x="300" y="640" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="#0284c7" text-anchor="middle">👉 annbhe182132.github.io/photo-challenge/</text>
  <text x="300" y="670" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="600" fill="#334155" text-anchor="middle">Mở camera điện thoại quét mã • Không cần tải ứng dụng</text>
  <text x="300" y="698" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12" font-weight="600" fill="#94a3b8" text-anchor="middle">Bộ bài 24 lá vật lý + WebApp Trọng tài AI Gemini & Bình chọn nhóm</text>
</svg>`;

  const blob = new Blob([badgeSvg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'snapdeck-box-qr-badge.svg';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadCardQrSheet = async (cards: PhysicalCard[]) => {
  return downloadAll25QrSheet(cards);
};

export const downloadAll25QrSheet = async (cards: PhysicalCard[]) => {
  const cellWidth = 300;
  const cellHeight = 150;
  const columns = 3;
  // Total 25 items: 1 Box QR + 24 Cards
  const totalItems = 1 + cards.length;
  const rows = Math.ceil(totalItems / columns);
  const { default: QRCode } = await import('qrcode');

  const boxSvg = await QRCode.toString(BOX_QR_VALUE, { type: 'svg', errorCorrectionLevel: 'H', margin: 1 });
  const cardSvgs = await Promise.all(cards.map((card) => (
    QRCode.toString(cardQrValue(card.code), { type: 'svg', errorCorrectionLevel: 'M', margin: 1 })
  )));

  // Cell 0: Box QR
  const boxViewBox = boxSvg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 33 33';
  const boxSvgContent = boxSvg.slice(boxSvg.indexOf('>') + 1, boxSvg.lastIndexOf('</svg>'));
  const boxCell = `<g transform="translate(0 0)"><rect width="${cellWidth}" height="${cellHeight}" fill="#f0f9ff" stroke="#0284c7" stroke-width="2"/><svg x="12" y="12" width="126" height="126" viewBox="${boxViewBox}">${boxSvgContent}</svg><text x="150" y="45" font-family="Arial,sans-serif" font-size="14" font-weight="900" fill="#0284c7">MÃ SỐ 25: BAO BÌ</text><text x="150" y="70" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="#0f172a">Vỏ Hộp Bộ Bài</text><text x="150" y="94" font-family="Arial,sans-serif" font-size="11" fill="#475569">Quét vào WebApp chơi</text><text x="150" y="118" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#0369a1">URL: photo-challenge/</text></g>`;

  // Cells 1 to 24: Cards
  const cardCells = cards.map((card, index) => {
    const itemIndex = index + 1;
    const svg = cardSvgs[index];
    const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 33 33';
    const svgContent = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
    const x = (itemIndex % columns) * cellWidth;
    const y = Math.floor(itemIndex / columns) * cellHeight;
    return `<g transform="translate(${x} ${y})"><rect width="${cellWidth}" height="${cellHeight}" fill="#ffffff" stroke="#cbd5e1"/><svg x="12" y="12" width="126" height="126" viewBox="${viewBox}">${svgContent}</svg><text x="150" y="65" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#0f172a">${card.code}</text><text x="150" y="91" font-family="Arial,sans-serif" font-size="13" fill="#334155">${escapeXml(card.title)}</text><text x="150" y="118" font-family="Arial,sans-serif" font-size="11" fill="#64748b">SNAPDECK:CARD</text></g>`;
  }).join('');

  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cellWidth * columns}" height="${cellHeight * rows}" viewBox="0 0 ${cellWidth * columns} ${cellHeight * rows}">${boxCell}${cardCells}</svg>`;
  const blob = new Blob([sheet], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'snapdeck-all-25-qr-codes.svg';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (character) => ({
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;',
}[character] ?? character));
