import multer from 'multer';
import { HttpError } from '../errors.js';
import {
  CONTENT_TYPES_ACEITOS,
  TAMANHO_MAXIMO_IMAGEM,
  detectarFormatoImagem,
} from '../storage/imagem.js';

const MENSAGEM_FORMATO = 'Formato de imagem inválido. Envie um arquivo JPG, PNG ou WEBP.';

const multerImagem = multer({
  // Fica em memória até ser validado; só vai para o storage quando a rota decidir salvar
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO_IMAGEM, files: 1 },
  fileFilter: (req, file, cb) => {
    if (CONTENT_TYPES_ACEITOS.includes(file.mimetype)) return cb(null, true);
    cb(new HttpError(415, MENSAGEM_FORMATO));
  },
});

/**
 * Lê uma imagem do campo multipart `campo` e valida formato e tamanho.
 * Se válida, deixa em req.imagem = { buffer, ext, contentType, tamanho }.
 * Não salva nada: a rota chama storage.save(req.imagem) quando for a hora.
 */
export function uploadImagem(campo = 'imagem') {
  const lerArquivo = multerImagem.single(campo);

  return (req, res, next) => {
    lerArquivo(req, res, (erro) => {
      if (erro instanceof multer.MulterError) {
        if (erro.code === 'LIMIT_FILE_SIZE') {
          return next(new HttpError(413, 'A imagem é muito grande. O tamanho máximo é 5 MB.'));
        }
        return next(new HttpError(400, `Envie apenas uma imagem no campo "${campo}".`));
      }
      if (erro) return next(erro);
      if (!req.file) return next();

      const formato = detectarFormatoImagem(req.file.buffer);
      if (!formato) return next(new HttpError(415, MENSAGEM_FORMATO));

      req.imagem = { buffer: req.file.buffer, tamanho: req.file.size, ...formato };
      next();
    });
  };
}
