const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    await client.connect();
    console.log('Conectado ao PostgreSQL do Supabase com sucesso.');

    // Atualizar cirurgias do mês 07/2026 onde status é MATERIAL ENTREGUE para carater = ELETIVA
    console.log('Atualizando cirurgias de 07/2026 com status MATERIAL ENTREGUE para carater = ELETIVA...');
    const res = await client.query(`
      UPDATE surgeries 
      SET carater = 'ELETIVA' 
      WHERE date >= '2026-07-01' 
        AND date <= '2026-07-31' 
        AND (status ILIKE '%entregue%' OR status ILIKE '%material entregue%');
    `);
    console.log(`Sucesso! Total de cirurgias atualizadas em 07/2026 para ELETIVA: ${res.rowCount}`);

    // Verificar quantas cirurgias com status MATERIAL ENTREGUE existem no mês 07/2026 no total
    const checkRes = await client.query(`
      SELECT id, patient, date, status, carater 
      FROM surgeries 
      WHERE date >= '2026-07-01' AND date <= '2026-07-31' AND (status ILIKE '%entregue%' OR status ILIKE '%material entregue%');
    `);
    console.log(`Total de cirurgias encontradas com status MATERIAL ENTREGUE no mês 07/2026: ${checkRes.rows.length}`);
    console.table(checkRes.rows.slice(0, 10));

  } catch (error) {
    console.error('Erro na migração:', error);
  } finally {
    await client.end();
  }
}

main();
