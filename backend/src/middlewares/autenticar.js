import jwt from 'jsonwebtoken';
import { verificarToken } from '../auth/token.js';
import { HttpError } from '../errors.js';

function naoAutenticado(res, mensagem) {
  res.set('WWW-Authenticate', 'Bearer');
  return new HttpError(401, mensagem);
}

/**
 * Exige `Authorization: Bearer <token>` válido.
 * Em caso de sucesso, deixa o usuário logado em req.usuario = { id }.
 * Toda consulta de rota protegida deve filtrar por req.usuario.id.
 */
export function autenticar(req, res, next) {
  const [esquema, token, ...resto] = (req.get('Authorization') ?? '').trim().split(/\s+/);

  if (!esquema) {
    return next(naoAutenticado(res, 'Token de autenticação não informado.'));
  }
  if (esquema.toLowerCase() !== 'bearer' || !token || resto.length) {
    return next(naoAutenticado(res, 'Use o cabeçalho Authorization: Bearer <token>.'));
  }

  let payload;
  try {
    payload = verificarToken(token);
  } catch (erro) {
    const mensagem =
      erro instanceof jwt.TokenExpiredError
        ? 'Sessão expirada. Faça login novamente.'
        : 'Token inválido.';
    return next(naoAutenticado(res, mensagem));
  }

  const id = Number(payload.sub);
  if (!Number.isInteger(id) || id <= 0) {
    return next(naoAutenticado(res, 'Token inválido.'));
  }

  req.usuario = { id };
  next();
}
