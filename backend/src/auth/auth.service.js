import { HttpError } from '../errors.js';
import { conferirSenha, hashSenha } from './senha.js';
import { gerarToken } from './token.js';

const VIOLACAO_UNICA = '23505';
const CAMPOS_PUBLICOS = ['id', 'nome', 'email', 'criado_em'];

// Hash de uma senha aleatória descartada. Quando o e-mail não existe, a senha é comparada
// com ele mesmo assim, para a resposta levar o mesmo tempo e não revelar quais e-mails existem.
const HASH_FALSO = '$2b$10$KSiVQK.HSCm7T506V7NPVuqog079z8sa2G5g0P3.m0X.TRO3vUXvK';

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

    /** Dados públicos do usuário, ou undefined se não existir. */
    buscarPorId(id) {
      return db('usuarios').where({ id }).first(CAMPOS_PUBLICOS);
    },

    /** Confere as credenciais e devolve { token, usuario }. Espera dados de validarLogin. */
    async login({ email, senha }) {
      const usuario = await db('usuarios')
        .where({ email })
        .first('id', 'nome', 'email', 'senha_hash');
      const senhaConfere = await conferirSenha(senha, usuario?.senha_hash ?? HASH_FALSO);

      // Mesma mensagem para e-mail inexistente e senha errada
      if (!usuario || !senhaConfere) throw new HttpError(401, 'E-mail ou senha inválidos.');

      const { id, nome } = usuario;
      return { token: gerarToken(usuario), usuario: { id, nome, email: usuario.email } };
    },
  };
}
