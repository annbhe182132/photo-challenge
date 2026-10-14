export const isInAppBrowser = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = (navigator.userAgent || navigator.vendor || '').toLowerCase();
  return /zalo|fban|fbav|instagram|messenger|tiktok|bytedance|line|micromessenger/i.test(ua);
};
