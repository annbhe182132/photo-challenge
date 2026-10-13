import fs from 'fs';
import path from 'path';
import QRCode from '../frontend/node_modules/qrcode/lib/index.js';

const boxUrl = 'https://annbhe182132.github.io/photo-challenge/';

async function generateBoxQRCodes() {
  console.log('Generating QR codes for URL:', boxUrl);

  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'frontend', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Generate High-Res PNG (2400x2400, 300 DPI suitable)
  const pngPathRoot = path.join(rootDir, 'box-packaging-qr.png');
  const pngPathPublic = path.join(publicDir, 'box-packaging-qr.png');
  await QRCode.toFile(pngPathRoot, boxUrl, {
    width: 2400,
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
  fs.copyFileSync(pngPathRoot, pngPathPublic);

  // 2. Generate Clean Vector SVG
  const cleanSvg = await QRCode.toString(boxUrl, {
    type: 'svg',
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
  const svgPathRoot = path.join(rootDir, 'box-packaging-qr.svg');
  const svgPathPublic = path.join(publicDir, 'box-packaging-qr.svg');
  fs.writeFileSync(svgPathRoot, cleanSvg, 'utf8');
  fs.copyFileSync(svgPathRoot, svgPathPublic);

  // 3. Generate Print-Ready Packaging Badge SVG with Frame & Instructions
  const viewBoxMatch = cleanSvg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 33 33';
  const qrInner = cleanSvg.slice(cleanSvg.indexOf('>') + 1, cleanSvg.lastIndexOf('</svg>'));

  const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>

  <!-- Background Card with Bleed Border -->
  <rect width="600" height="750" rx="36" fill="url(#bgGrad)" stroke="#0284c7" stroke-width="6"/>
  <rect x="16" y="16" width="568" height="718" rx="24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="8 8"/>

  <!-- Header Badge -->
  <rect x="70" y="40" width="460" height="52" rx="26" fill="#0f172a"/>
  <text x="300" y="73" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="20" font-weight="900" fill="#38bdf8" text-anchor="middle" letter-spacing="3">PHOTO CHALLENGE</text>

  <!-- Call to Action -->
  <text x="300" y="132" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="26" font-weight="900" fill="#0f172a" text-anchor="middle">QUÉT MÃ VÀO WEB APP CHƠI NGAY</text>
  <text x="300" y="162" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="600" fill="#64748b" text-anchor="middle">Trải nghiệm Board Game Phygital kết hợp Trí Tuệ Nhân Tạo (AI)</text>

  <!-- QR Code Frame -->
  <rect x="90" y="185" width="420" height="420" rx="28" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
  <svg x="110" y="205" width="380" height="380" viewBox="${viewBox}">
    ${qrInner}
  </svg>

  <!-- Footer Instructions -->
  <text x="300" y="640" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="#0284c7" text-anchor="middle">👉 annbhe182132.github.io/photo-challenge/</text>
  <text x="300" y="670" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="600" fill="#334155" text-anchor="middle">Mở camera điện thoại quét mã • Không cần tải ứng dụng</text>
  <text x="300" y="698" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12" font-weight="600" fill="#94a3b8" text-anchor="middle">Bộ bài 24 lá vật lý + WebApp AI • Bản quyền © 2026</text>
</svg>`;

  const badgePathRoot = path.join(rootDir, 'box-packaging-qr-badge.svg');
  const badgePathPublic = path.join(publicDir, 'box-packaging-qr-badge.svg');
  fs.writeFileSync(badgePathRoot, badgeSvg, 'utf8');
  fs.copyFileSync(badgePathRoot, badgePathPublic);

  console.log('Done! Created:');
  console.log(' - box-packaging-qr.png (2400x2400 high-res PNG)');
  console.log(' - box-packaging-qr.svg (Vector SVG)');
  console.log(' - box-packaging-qr-badge.svg (Print-ready badge SVG)');
}

generateBoxQRCodes().catch(console.error);
