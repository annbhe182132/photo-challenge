import { useEffect, useState } from 'react';

interface QRCodeImageProps {
  value: string;
  size?: number;
  alt: string;
}

const QRCodeImage = ({ value, size = 128, alt }: QRCodeImageProps) => {
  const [result, setResult] = useState<{ value: string; imageUrl: string | null; hasError: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })).then((url) => {
      if (!cancelled) setResult({ value, imageUrl: url, hasError: false });
    }).catch(() => {
      if (!cancelled) setResult({ value, imageUrl: null, hasError: true });
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!result || result.value !== value) {
    return <div className="rounded-lg bg-white/10" aria-label="Đang tạo mã QR" style={{ width: size, height: size }} />;
  }
  if (!result.imageUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-white/10 px-2 text-center text-[10px] text-red-200"
        aria-label={result.hasError ? 'Không thể tạo mã QR' : 'Đang tạo mã QR'}
        style={{ width: size, height: size }}
      >
        Không thể tạo mã QR
      </div>
    );
  }
  return <img src={result.imageUrl} alt={alt} width={size} height={size} className="rounded-lg bg-white p-1" />;
};

export default QRCodeImage;
