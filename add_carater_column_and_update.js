const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    await client.connect();
    console.log('Conectado ao PostgreSQL do Supabase com sucesso.');

    // 1. Adicionar coluna carater na tabela surgeries se não existir
    console.log('Garantindo coluna carater na tabela surgeries...');
    await client.query(`
      ALTER TABLE surgeries 
      ADD COLUMN IF NOT EXISTS carater text;
    `);
    console.log('Coluna carater pronta.');

    // 2. Garantir tabela carater para cadastros básicos
    console.log('Garantindo tabela carater...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS carater (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name text UNIQUE NOT NULL,
        created_at timestamp with time zone default now()
      );
    `);
    await client.query(`
      INSERT INTO carater (name) VALUES ('ELETIVA'), ('URGÊNCIA'), ('JUDICIAL')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('Tabela carater configurada com os padrões.');

    // 3. Atualizar cirurgias do mês 07/2026 onde status é URGENCIA para carater = URGÊNCIA
    console.log('Atualizando cirurgias de 07/2026 com status URGENCIA para carater = URGÊNCIA...');
    const res = await client.query(`
      UPDATE surgeries 
      SET carater = 'URGÊNCIA' 
      WHERE date >= '2026-07-01' 
        AND date <= '2026-07-31' 
        AND (status ILIKE '%urgencia%' OR status ILIKE '%urgência%');
    `);
    console.log(`Sucesso! Total de cirurgias atualizadas em 07/2026: ${res.rowCount}`);

    // Verificar quantas cirurgias com status URGENCIA existem no mês 07/2026 no total
    const checkRes = await client.query(`
      SELECT id, patient, date, status, carater 
      FROM surgeries 
      WHERE date >= '2026-07-01' AND date <= '2026-07-31' AND (status ILIKE '%urgencia%' OR status ILIKE '%urgência%');
    `);
    console.log(`Total de cirurgias encontradas com status URGÊNCIA no mês 07/2026: ${checkRes.rows.length}`);
    console.table(checkRes.rows.slice(0, 10));

  } catch (error) {
    console.error('Erro na migração:', error);
  } finally {
    await client.end();
  }
}

main();
