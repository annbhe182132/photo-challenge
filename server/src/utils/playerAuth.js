import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const createPlayerToken = () => randomBytes(32).toString('hex');

export const hashPlayerToken = (token) => createHash('sha256').update(token).digest('hex');

export const verifyPlayerToken = (token, storedHash) => {
  if (typeof token !== 'string' || typeof storedHash !== 'string') return false;
  const expectedHash = Buffer.from(storedHash, 'hex');
  const suppliedHash = Buffer.from(hashPlayerToken(token), 'hex');
  return expectedHash.length === suppliedHash.length && timingSafeEqual(expectedHash, suppliedHash);
};
