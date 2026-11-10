// Fora do Docker, as variáveis vêm do .env da raiz.
// Variáveis já definidas no ambiente (ex.: pelo docker-compose) têm prioridade.
try {
  process.loadEnvFile(new URL('../.env', import.meta.url));
} catch {
  // .env não encontrado: segue só com o ambiente
}

export default {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  },
  migrations: {
    directory: './src/database/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './src/database/seeds',
  },
};
