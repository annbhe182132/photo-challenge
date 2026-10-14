import mongoose from 'mongoose';

const getBucket = () => {
  if (!mongoose.connection.db) {
    throw new Error('Kho ảnh chưa sẵn sàng vì MongoDB chưa kết nối.');
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'challengeEvidence' });
};

export const storeEvidence = (buffer, contentType, metadata) => new Promise((resolve, reject) => {
  const upload = getBucket().openUploadStream(`evidence-${Date.now()}`, {
    contentType,
    metadata,
  });
  upload.once('error', reject);
  upload.once('finish', () => resolve(String(upload.id)));
  upload.end(buffer);
});

export const readEvidenceDataUrl = async (fileId, roomCode) => {
  const bucket = getBucket();
  const id = new mongoose.mongo.ObjectId(fileId);
  const file = await bucket.find({ _id: id, 'metadata.roomCode': roomCode }).next();
  if (!file) return null;

  const chunks = [];
  await new Promise((resolve, reject) => {
    const stream = bucket.openDownloadStream(id);
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.once('error', reject);
    stream.once('end', resolve);
  });
  return `data:${file.contentType};base64,${Buffer.concat(chunks).toString('base64')}`;
};

export const deleteEvidence = async (fileId) => {
  if (!fileId || !mongoose.connection.db) return;
  await getBucket().delete(new mongoose.mongo.ObjectId(fileId));
};
