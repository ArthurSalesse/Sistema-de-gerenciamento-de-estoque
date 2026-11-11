export const SENHA_MIN = 8;
// O bcrypt ignora tudo depois de 72 bytes; senhas maiores dariam falsa sensação de segurança
export const SENHA_MAX_BYTES = 72;
const NOME_MAX = 120;
const EMAIL_MAX = 255;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizarEmail = (email) => email.trim().toLowerCase();

/**
 * Valida o corpo do cadastro.
 * Retorna { dados } com os valores normalizados ou { erros } com uma mensagem por campo.
 */
export function validarCadastro(body) {
  const { nome, email, senha } = body ?? {};
  const erros = {};

  if (nome === undefined || nome === null || (typeof nome === 'string' && !nome.trim())) {
    erros.nome = 'O nome é obrigatório.';
  } else if (typeof nome !== 'string') {
    erros.nome = 'O nome deve ser um texto.';
  } else if (nome.trim().length > NOME_MAX) {
    erros.nome = `O nome deve ter no máximo ${NOME_MAX} caracteres.`;
  }

  if (email === undefined || email === null || (typeof email === 'string' && !email.trim())) {
    erros.email = 'O e-mail é obrigatório.';
  } else if (typeof email !== 'string') {
    erros.email = 'O e-mail deve ser um texto.';
  } else if (normalizarEmail(email).length > EMAIL_MAX) {
    erros.email = `O e-mail deve ter no máximo ${EMAIL_MAX} caracteres.`;
  } else if (!FORMATO_EMAIL.test(normalizarEmail(email))) {
    erros.email = 'Informe um e-mail válido.';
  }

  if (senha === undefined || senha === null || senha === '') {
    erros.senha = 'A senha é obrigatória.';
  } else if (typeof senha !== 'string') {
    erros.senha = 'A senha deve ser um texto.';
  } else if (senha.length < SENHA_MIN) {
    erros.senha = `A senha deve ter no mínimo ${SENHA_MIN} caracteres.`;
  } else if (Buffer.byteLength(senha) > SENHA_MAX_BYTES) {
    erros.senha = `A senha deve ter no máximo ${SENHA_MAX_BYTES} caracteres.`;
  }

  if (Object.keys(erros).length) return { erros };

  // A senha não é alterada (nem trim): espaços fazem parte dela
  return { dados: { nome: nome.trim(), email: normalizarEmail(email), senha } };
}
