export async function up(knex) {
  await knex.schema.createTable('usuarios', (table) => {
    table.increments('id');
    table.string('nome', 120).notNullable();
    table.string('email', 255).notNullable().unique({ indexName: 'usuarios_email_unique' });
    table.string('senha_hash', 255).notNullable();
    table.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTable('usuarios');
}
