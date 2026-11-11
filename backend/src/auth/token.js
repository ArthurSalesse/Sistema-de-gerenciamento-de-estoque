import jwt from 'jsonwebtoken';

const ALGORITMO = 'HS256';
const SEGREDO_MIN = 32;

/** Lê o segredo do ambiente e falha cedo, com mensagem clara, se estiver ausente ou fraco. */
export function exigirSegredoJwt() {
  const segredo = process.env.JWT_SECRET;
  if (!segredo || segredo.length < SEGREDO_MIN) {
    throw new Error(
      `JWT_SECRET precisa estar definido no .env com pelo menos ${SEGREDO_MIN} caracteres.`,
    );
  }
  return segredo;
}

/** Gera o token com o id do usuário em `sub` e expiração em JWT_EXPIRES_IN (padrão 8h). */
export function gerarToken(usuario) {
  return jwt.sign({}, exigirSegredoJwt(), {
    algorithm: ALGORITMO,
    subject: String(usuario.id),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

/** Valida assinatura e expiração; lança erro do jsonwebtoken se inválido. */
export function verificarToken(token) {
  return jwt.verify(token, exigirSegredoJwt(), { algorithms: [ALGORITMO] });
}
