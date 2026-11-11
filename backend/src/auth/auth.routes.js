import { Router } from 'express';
import { HttpError, ValidacaoError } from '../errors.js';
import { autenticar } from '../middlewares/autenticar.js';
import { createAuthService } from './auth.service.js';
import { validarCadastro, validarLogin } from './validacao.js';

export function createAuthRouter({ db }) {
  const router = Router();
  const authService = createAuthService({ db });

  router.post('/cadastro', async (req, res) => {
    const { dados, erros } = validarCadastro(req.body);
    if (erros) throw new ValidacaoError(erros);

    const usuario = await authService.cadastrar(dados);
    res.status(201).json(usuario);
  });

  router.post('/login', async (req, res) => {
    const { dados, erros } = validarLogin(req.body);
    if (erros) throw new ValidacaoError(erros);

    res.json(await authService.login(dados));
  });

  router.get('/me', autenticar, async (req, res) => {
    const usuario = await authService.buscarPorId(req.usuario.id);
    // Token válido, mas a conta não existe mais
    if (!usuario) throw new HttpError(401, 'Usuário não encontrado. Faça login novamente.');
    res.json(usuario);
  });

  return router;
}
