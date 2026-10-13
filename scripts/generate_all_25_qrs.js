import fs from 'fs';
import path from 'path';
import QRCode from '../frontend/node_modules/qrcode/lib/index.js';

// 24 Cards definition
const CARD_CODES = [
  { code: 'SD-CARD-001', title: 'Fashion Model Bàn Ăn' },
  { code: 'SD-CARD-002', title: 'Khoảnh Khắc Cầu Xin' },
  { code: 'SD-CARD-003', title: 'Tác Phẩm Tượng Sống' },
  { code: 'SD-CARD-004', title: 'Gương Mặt Đa Nhân Cách' },
  { code: 'SD-CARD-005', title: 'Poster Phim Hành Động' },
  { code: 'SD-CARD-006', title: 'Ca Sĩ Diva Sân Khấu' },
  { code: 'SD-CARD-007', title: 'Cú Lừa Vô Tội' },
  { code: 'SD-CARD-008', title: 'Bản Tin Thời Sự Trực Tiếp' },
  { code: 'SD-CARD-009', title: 'Trái Tim Đồng Điệu' },
  { code: 'SD-CARD-010', title: 'Cạn Ly Gắn Kết' },
  { code: 'SD-CARD-011', title: 'Điểm Tựa Vững Chắc' },
  { code: 'SD-CARD-012', title: 'Cặp Đôi Bất Đắc Dĩ' },
  { code: 'SD-CARD-013', title: 'Đôi Mắt Biết Nói' },
  { code: 'SD-CARD-014', title: 'Vật Bất Ly Thân' },
  { code: 'SD-CARD-015', title: 'Nghệ Thuật Khung Hình' },
  { code: 'SD-CARD-016', title: 'Sinh Vật Bí Ẩn' },
  { code: 'SD-CARD-017', title: 'Góc Nhìn Khác Biệt' },
  { code: 'SD-CARD-018', title: 'Mặt Trời Tí Hon' },
  { code: 'SD-CARD-019', title: 'Nụ Cười Thật Trân' },
  { code: 'SD-CARD-020', title: 'Biểu Cảm Khó Đỡ' },
  { code: 'SD-CARD-021', title: 'Lời Thú Tội Ngọt Ngào' },
  { code: 'SD-CARD-022', title: 'Phản Ứng Bất Ngờ' },
  { code: 'SD-CARD-023', title: 'Chớp Mắt Thần Tốc' },
  { code: 'SD-CARD-024', title: 'Truy Tìm Kẻ Phá Đám' },
];

const BOX_URL = 'https://annbhe182132.github.io/photo-challenge/';
const cardQrUrl = (code) => `https://annbhe182132.github.io/photo-challenge/#/scan?cardCode=${encodeURIComponent(code)}`;

const escapeXml = (value) => value.replace(/[<>&'"]/g, (c) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
}[c] || c));

async function run() {
  const cellWidth = 320;
  const cellHeight = 160;
  const columns = 3;
  const totalItems = 1 + CARD_CODES.length; // 25
  const rows = Math.ceil(totalItems / columns);

  // 1. Box QR
  const boxSvg = await QRCode.toString(BOX_URL, { type: 'svg', errorCorrectionLevel: 'H', margin: 1 });
  const boxViewBox = boxSvg.match(/viewBox="([^"]+)"/)?.[1] || '0 0 33 33';
  const boxSvgContent = boxSvg.slice(boxSvg.indexOf('>') + 1, boxSvg.lastIndexOf('</svg>'));

  const boxCell = `<g transform="translate(0 0)">
    <rect width="${cellWidth}" height="${cellHeight}" fill="#f0f9ff" stroke="#0284c7" stroke-width="2.5" rx="8"/>
    <svg x="12" y="16" width="128" height="128" viewBox="${boxViewBox}">${boxSvgContent}</svg>
    <rect x="152" y="20" width="150" height="22" rx="11" fill="#0284c7"/>
    <text x="227" y="35" font-family="'Segoe UI', Arial, sans-serif" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle">MÃ SỐ 25: IN VỎ HỘP</text>
    <text x="152" y="66" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="800" fill="#0f172a">Vỏ Hộp Bộ Bài</text>
    <text x="152" y="90" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="500" fill="#475569">Quét vào WebApp chơi</text>
    <text x="152" y="112" font-family="'Segoe UI', Arial, sans-serif" font-size="10" font-weight="700" fill="#0369a1">photo-challenge/</text>
    <text x="152" y="132" font-family="'Segoe UI', Arial, sans-serif" font-size="9" fill="#64748b">Level H (300 DPI Vector)</text>
  </g>`;

  // 2. Cards 1-24
  const cardSvgs = await Promise.all(CARD_CODES.map((c) => QRCode.toString(cardQrUrl(c.code), { type: 'svg', errorCorrectionLevel: 'M', margin: 1 })));

  const cardCells = CARD_CODES.map((c, i) => {
    const itemIdx = i + 1;
    const svg = cardSvgs[i];
    const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] || '0 0 33 33';
    const svgContent = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
    const x = (itemIdx % columns) * cellWidth;
    const y = Math.floor(itemIdx / columns) * cellHeight;

    return `<g transform="translate(${x} ${y})">
      <rect width="${cellWidth}" height="${cellHeight}" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" rx="8"/>
      <svg x="12" y="16" width="128" height="128" viewBox="${viewBox}">${svgContent}</svg>
      <text x="152" y="44" font-family="monospace" font-size="15" font-weight="800" fill="#0284c7">${c.code}</text>
      <text x="152" y="70" font-family="'Segoe UI', Arial, sans-serif" font-size="14" font-weight="700" fill="#0f172a">${escapeXml(c.title)}</text>
      <text x="152" y="96" font-family="'Segoe UI', Arial, sans-serif" font-size="11" fill="#475569">Lá Bài Thử Thách Physical</text>
      <text x="152" y="122" font-family="'Segoe UI', Arial, sans-serif" font-size="10" font-weight="600" fill="#64748b">SNAPDECK:CARD</text>
    </g>`;
  }).join('\n');

  const fullSheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cellWidth * columns}" height="${cellHeight * rows}" viewBox="0 0 ${cellWidth * columns} ${cellHeight * rows}">
    <!-- Background -->
    <rect width="${cellWidth * columns}" height="${cellHeight * rows}" fill="#f8fafc"/>
    ${boxCell}
    ${cardCells}
  </svg>`;

  fs.writeFileSync('./photo-challenge-all-25-qr-codes.svg', fullSheet, 'utf8');
  fs.writeFileSync('./frontend/public/photo-challenge-all-25-qr-codes.svg', fullSheet, 'utf8');
  console.log('Exported all 25 QR codes SVG sheet successfully!');
}

run().catch(console.error);
