import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Guarda os arquivos numa pasta local e os serve em `${publicUrl}/<nome>`.
 * Outro driver (S3, Cloudinary...) só precisa implementar save() e remove().
 */
export function createLocalStorage({ dir, publicUrl }) {
  const pasta = path.resolve(dir);
  const baseUrl = publicUrl.replace(/\/+$/, '');

  return {
    driver: 'local',
    pasta,

    async save({ buffer, ext }) {
      // Nome sempre gerado aqui: o nome original do arquivo nunca é usado
      const key = `${randomUUID()}.${ext}`;
      await mkdir(pasta, { recursive: true });
      await writeFile(path.join(pasta, key), buffer, { flag: 'wx' });
      return { key, url: `${baseUrl}/${key}` };
    },

    /** Aceita a key ou a URL completa. Não falha se o arquivo já não existir. */
    async remove(keyOuUrl) {
      if (!keyOuUrl) return;
      // basename impede caminhos como "../../.env"
      const key = path.basename(new URL(keyOuUrl, 'http://x').pathname);
      try {
        await unlink(path.join(pasta, key));
      } catch (erro) {
        if (erro.code !== 'ENOENT') throw erro;
      }
    },
  };
}
