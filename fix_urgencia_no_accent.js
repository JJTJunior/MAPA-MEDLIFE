const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    await client.connect();
    console.log('Conectado ao PostgreSQL do Supabase com sucesso.');

    // 1. Atualizar cirurgias onde carater = 'URGÊNCIA' para 'URGENCIA'
    console.log('Atualizando cirurgias com carater URGÊNCIA para URGENCIA (sem acento)...');
    const res = await client.query(`
      UPDATE surgeries 
      SET carater = 'URGENCIA' 
      WHERE carater = 'URGÊNCIA' OR carater ILIKE 'urgência';
    `);
    console.log(`Sucesso! Total de cirurgias atualizadas para URGENCIA (sem acento): ${res.rowCount}`);

    // 2. Atualizar cadastro na tabela carater
    await client.query(`
      UPDATE carater 
      SET name = 'URGENCIA' 
      WHERE name = 'URGÊNCIA';
    `);
    console.log('Tabela carater atualizada para URGENCIA.');

    // Verificar contagem final
    const checkRes = await client.query(`
      SELECT count(*) FROM surgeries WHERE carater = 'URGENCIA';
    `);
    console.log(`Total de cirurgias com carater URGENCIA agora: ${checkRes.rows[0].count}`);

  } catch (error) {
    console.error('Erro ao atualizar URGENCIA:', error);
  } finally {
    await client.end();
  }
}

main();
