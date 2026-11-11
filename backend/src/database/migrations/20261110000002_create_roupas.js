export async function up(knex) {
  await knex.schema.createTable('roupas', (table) => {
    table.increments('id');
    table
      .integer('usuario_id')
      .notNullable()
      .references('id')
      .inTable('usuarios')
      .onDelete('RESTRICT');
    table.string('nome', 120).notNullable();
    table.integer('quantidade').notNullable().defaultTo(0);
    table.decimal('valor', 10, 2).notNullable();
    table.text('imagem_url');
    table.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('atualizado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    // Soft delete: nulo = roupa ativa
    table.timestamp('excluido_em', { useTz: true });

    table.index('usuario_id', 'roupas_usuario_id_index');
    table.check('quantidade >= 0', [], 'roupas_quantidade_nao_negativa');
    table.check('valor >= 0', [], 'roupas_valor_nao_negativo');
  });
}

export async function down(knex) {
  await knex.schema.dropTable('roupas');
}
