export const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024; // 5 MB

// O tipo é detectado pelos primeiros bytes do arquivo (assinatura), não pela extensão
// nem pelo Content-Type enviado pelo cliente, que podem ser falsificados.
const FORMATOS = [
  {
    ext: 'jpg',
    contentType: 'image/jpeg',
    corresponde: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: 'png',
    contentType: 'image/png',
    corresponde: (b) =>
      b.length >= 8 &&
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    ext: 'webp',
    contentType: 'image/webp',
    corresponde: (b) =>
      b.length >= 12 &&
      b.toString('ascii', 0, 4) === 'RIFF' &&
      b.toString('ascii', 8, 12) === 'WEBP',
  },
];

export const CONTENT_TYPES_ACEITOS = FORMATOS.map((f) => f.contentType);

/** Retorna { ext, contentType } se o buffer for JPG, PNG ou WEBP; senão null. */
export function detectarFormatoImagem(buffer) {
  const formato = FORMATOS.find((f) => f.corresponde(buffer));
  return formato ? { ext: formato.ext, contentType: formato.contentType } : null;
}
