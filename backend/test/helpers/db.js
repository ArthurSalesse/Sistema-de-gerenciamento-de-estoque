import knex from 'knex';
import config from '../../knexfile.js';

// Os testes usam um banco separado (<POSTGRES_DB>_test) para não apagar os dados de desenvolvimento
const nomeBancoTeste = `${config.connection.database}_test`;

async function criarBancoSeNaoExistir() {
  const admin = knex({ ...config, pool: { min: 0, max: 1 } });
  try {
    const existe = await admin('pg_database').where({ datname: nomeBancoTeste }).first();
    if (!existe) await admin.raw('CREATE DATABASE ??', [nomeBancoTeste]);
  } catch (erro) {
    if (erro.code === 'ECONNREFUSED') {
      throw new Error(
        'Banco indisponível para os testes. Suba o Postgres: docker compose up -d db',
      );
    }
    if (erro.code !== '42P04') throw erro; // 42P04: outro processo acabou de criar
  } finally {
    await admin.destroy();
  }
}

/** Cria/migra o banco de teste e devolve a conexão. Chame db.destroy() ao final. */
export async function criarDbTeste() {
  await criarBancoSeNaoExistir();
  const db = knex({ ...config, connection: { ...config.connection, database: nomeBancoTeste } });
  await db.migrate.latest();
  return db;
}

export const limparTabelas = (db) =>
  db.raw('TRUNCATE vendas, roupas, usuarios RESTART IDENTITY CASCADE');
