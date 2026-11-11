import bcrypt from 'bcryptjs';

const CUSTO_BCRYPT = 10;

export const hashSenha = (senha) => bcrypt.hash(senha, CUSTO_BCRYPT);
export const conferirSenha = (senha, hash) => bcrypt.compare(senha, hash);
