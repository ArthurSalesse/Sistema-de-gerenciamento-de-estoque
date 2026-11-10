import { createLocalStorage } from './local-storage.js';

export const ROTA_UPLOADS = '/uploads';

export function createStorage(env = process.env) {
  const driver = env.STORAGE_DRIVER || 'local';

  switch (driver) {
    case 'local':
      return createLocalStorage({
        dir: env.UPLOAD_DIR || 'uploads',
        publicUrl: `${env.API_PUBLIC_URL || 'http://localhost:3000'}${ROTA_UPLOADS}`,
      });
    // case 's3': return createS3Storage({ ... });
    default:
      throw new Error(`STORAGE_DRIVER desconhecido: "${driver}"`);
  }
}

export const storage = createStorage();
