import type { PhysicalCard } from '../data/gameData';

export type QRCodePayload =
  | { type: 'room'; code: string }
  | { type: 'card'; code: string };

const ROOM_CODE_PATTERN = /^ROOM-[A-Z0-9]{4,12}$/i;
const CARD_CODE_PATTERN = /^PC-CARD-\d{3}$/i;

const parseTypedPayload = (value: string): QRCodePayload | null => {
  const match = value.match(/^PHOTO-CHALLENGE:(ROOM|CARD):(.+)$/i);
  if (!match) return null;

  const code = match[2].trim().toUpperCase();
  if (match[1].toUpperCase() === 'ROOM' && ROOM_CODE_PATTERN.test(code)) {
    return { type: 'room', code };
  }
  if (match[1].toUpperCase() === 'CARD' && CARD_CODE_PATTERN.test(code)) {
    return { type: 'card', code };
  }
  return null;
};

export const parseQRCodePayload = (rawValue: string): QRCodePayload | null => {
  const value = rawValue.trim();
  const typedPayload = parseTypedPayload(value);
  if (typedPayload) return typedPayload;

  const normalized = value.toUpperCase();
  if (ROOM_CODE_PATTERN.test(normalized)) return { type: 'room', code: normalized };
  if (CARD_CODE_PATTERN.test(normalized)) return { type: 'card', code: normalized };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
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

    for (let index = 0; index < upperSegments.length - 1; index += 1) {
      const marker = upperSegments[index];
      const code = upperSegments[index + 1];
      if (['ROOM', 'ROOMS'].includes(marker) && ROOM_CODE_PATTERN.test(code)) {
        return { type: 'room', code };
      }
      if (['CARD', 'CARDS'].includes(marker) && CARD_CODE_PATTERN.test(code)) {
        return { type: 'card', code };
      }
      if (marker === 'QR' && upperSegments[index - 1] === 'MISSIONS' && CARD_CODE_PATTERN.test(code)) {
        return { type: 'card', code };
      }
    }

    const joinIndex = upperSegments.indexOf('JOIN');
    const joinCode = upperSegments[joinIndex + 1];
    if (joinIndex >= 0 && ROOM_CODE_PATTERN.test(joinCode ?? '')) {
      return { type: 'room', code: joinCode };
    }
  }

  const hashQuery = url.hash.includes('?') ? new URLSearchParams(url.hash.slice(url.hash.indexOf('?') + 1)) : null;
  const roomQueryCode = url.searchParams.get('roomCode') ?? hashQuery?.get('roomCode');
  if (roomQueryCode && ROOM_CODE_PATTERN.test(roomQueryCode.toUpperCase())) {
    return { type: 'room', code: roomQueryCode.toUpperCase() };
  }
  const cardQueryCode = url.searchParams.get('cardCode') ?? hashQuery?.get('cardCode');
  if (cardQueryCode && CARD_CODE_PATTERN.test(cardQueryCode.toUpperCase())) {
    return { type: 'card', code: cardQueryCode.toUpperCase() };
  }
  return null;
};

export const roomQrValue = (roomCode: string) => `PHOTO-CHALLENGE:ROOM:${roomCode.toUpperCase()}`;
export const cardQrValue = (cardCode: string) => `https://annbhe182132.github.io/photo-challenge/#/scan?cardCode=${encodeURIComponent(cardCode.toUpperCase())}`;

export const downloadCardQrSheet = async (cards: PhysicalCard[]) => {
  const cellWidth = 300;
  const cellHeight = 150;
  const columns = 3;
  const rows = Math.ceil(cards.length / columns);
  const { default: QRCode } = await import('qrcode');
  const qrSvgs = await Promise.all(cards.map((card) => (
    QRCode.toString(cardQrValue(card.code), { type: 'svg', errorCorrectionLevel: 'M', margin: 1 })
  )));

  const cells = cards.map((card, index) => {
    const svg = qrSvgs[index];
    const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 33 33';
    const svgContent = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
    const x = (index % columns) * cellWidth;
    const y = Math.floor(index / columns) * cellHeight;
    return `<g transform="translate(${x} ${y})"><rect width="${cellWidth}" height="${cellHeight}" fill="#ffffff" stroke="#cbd5e1"/><svg x="12" y="12" width="126" height="126" viewBox="${viewBox}">${svgContent}</svg><text x="150" y="65" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#0f172a">${card.code}</text><text x="150" y="91" font-family="Arial,sans-serif" font-size="13" fill="#334155">${escapeXml(card.title)}</text><text x="150" y="118" font-family="Arial,sans-serif" font-size="11" fill="#64748b">PHOTO-CHALLENGE:CARD</text></g>`;
  }).join('');

  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cellWidth * columns}" height="${cellHeight * rows}" viewBox="0 0 ${cellWidth * columns} ${cellHeight * rows}">${cells}</svg>`;
  const blob = new Blob([sheet], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'photo-challenge-card-qr-codes.svg';
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
