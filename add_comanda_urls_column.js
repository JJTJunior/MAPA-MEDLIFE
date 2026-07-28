const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    await client.connect();
    
    console.log('Adicionando coluna comanda_urls na tabela surgeries...');
    await client.query(`
      ALTER TABLE surgeries 
      ADD COLUMN IF NOT EXISTS comanda_urls text[] DEFAULT '{}'::text[];
    `);
    console.log('Coluna comanda_urls adicionada com sucesso.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}
main();
