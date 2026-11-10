export async function up(knex) {
  await knex.schema.createTable('vendas', (table) => {
    table.increments('id');
    table.integer('roupa_id').notNullable().references('id').inTable('roupas').onDelete('RESTRICT');
    table
      .integer('usuario_id')
      .notNullable()
      .references('id')
      .inTable('usuarios')
      .onDelete('RESTRICT');
    table.integer('quantidade').notNullable();
    // Preço no momento da venda, para o histórico não mudar se a roupa mudar de preço
    table.decimal('valor_unitario', 10, 2).notNullable();
    table.timestamp('vendido_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Base das consultas do dashboard (vendas do usuário por período)
    table.index(['usuario_id', 'vendido_em'], 'vendas_usuario_id_vendido_em_index');
    table.check('quantidade > 0', [], 'vendas_quantidade_positiva');
    table.check('valor_unitario >= 0', [], 'vendas_valor_unitario_nao_negativo');
  });
}

export async function down(knex) {
  await knex.schema.dropTable('vendas');
}
