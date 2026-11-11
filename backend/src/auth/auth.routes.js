import { Router } from 'express';
import { ValidacaoError } from '../errors.js';
import { createAuthService } from './auth.service.js';
import { validarCadastro } from './validacao.js';

export function createAuthRouter({ db }) {
  const router = Router();
  const authService = createAuthService({ db });

  router.post('/cadastro', async (req, res) => {
    const { dados, erros } = validarCadastro(req.body);
    if (erros) throw new ValidacaoError(erros);

    const usuario = await authService.cadastrar(dados);
    res.status(201).json(usuario);
  });

  return router;
}
