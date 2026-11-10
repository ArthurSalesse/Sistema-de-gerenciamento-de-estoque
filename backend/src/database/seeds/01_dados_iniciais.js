import bcrypt from 'bcryptjs';

export const USUARIO_TESTE = {
  nome: 'Usuário Teste',
  email: 'teste@estoque.com',
  senha: 'senha123',
};

const ROUPAS = [
  { nome: 'Camiseta básica branca', quantidade: 25, valor: '39.90' },
  { nome: 'Calça jeans skinny', quantidade: 12, valor: '129.90' },
  { nome: 'Vestido floral', quantidade: 8, valor: '159.00' },
  { nome: 'Jaqueta corta-vento', quantidade: 5, valor: '219.90' },
  { nome: 'Moletom canguru', quantidade: 0, valor: '149.90' },
];

// [índice da roupa, quantidade, dias atrás] — espalhadas em dias e meses diferentes
const VENDAS = [
  [0, 2, 0],
  [1, 1, 0],
  [2, 1, 1],
  [0, 3, 2],
  [3, 1, 3],
  [4, 2, 5],
  [1, 1, 8],
  [0, 1, 12],
  [2, 2, 20],
  [3, 1, 35],
  [0, 4, 40],
  [4, 1, 47],
  [1, 2, 62],
  [2, 1, 75],
  [0, 2, 95],
];

function diasAtras(dias) {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  data.setHours(10 + (dias % 8), 0, 0, 0);
  return data;
}

export async function seed(knex) {
  await knex.raw('TRUNCATE vendas, roupas, usuarios RESTART IDENTITY CASCADE');

  const [usuario] = await knex('usuarios')
    .insert({
      nome: USUARIO_TESTE.nome,
      email: USUARIO_TESTE.email,
      senha_hash: await bcrypt.hash(USUARIO_TESTE.senha, 10),
    })
    .returning('id');

  const roupas = await knex('roupas')
    .insert(ROUPAS.map((roupa) => ({ ...roupa, usuario_id: usuario.id })))
    .returning(['id', 'valor']);

  await knex('vendas').insert(
    VENDAS.map(([indice, quantidade, dias]) => ({
      roupa_id: roupas[indice].id,
      usuario_id: usuario.id,
      quantidade,
      valor_unitario: roupas[indice].valor,
      vendido_em: diasAtras(dias),
    })),
  );
}
