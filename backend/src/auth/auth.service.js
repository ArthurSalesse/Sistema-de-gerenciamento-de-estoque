import { HttpError } from '../errors.js';
import { hashSenha } from './senha.js';

const VIOLACAO_UNICA = '23505';
const CAMPOS_PUBLICOS = ['id', 'nome', 'email', 'criado_em'];

export function createAuthService({ db }) {
  return {
    /** Cria o usuário. Espera dados já validados e normalizados (ver validarCadastro). */
    async cadastrar({ nome, email, senha }) {
      const emailEmUso = () => new HttpError(409, 'Este e-mail já está cadastrado.');

      if (await db('usuarios').where({ email }).first('id')) throw emailEmUso();

      try {
        const [usuario] = await db('usuarios')
          .insert({ nome, email, senha_hash: await hashSenha(senha) })
          .returning(CAMPOS_PUBLICOS);
        return usuario;
      } catch (erro) {
        // Dois cadastros simultâneos com o mesmo e-mail: o índice único do banco barra o segundo
        if (erro.code === VIOLACAO_UNICA) throw emailEmUso();
        throw erro;
      }
    },
  };
}
