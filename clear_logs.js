const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    
    // Count before deleting
    const resultBefore = await client.query(`SELECT COUNT(*) FROM public.audit_logs;`);
    console.log(`Encontrados ${resultBefore.rows[0].count} logs para deletar.`);

    // Delete all logs
    const resultDelete = await client.query(`DELETE FROM public.audit_logs;`);
    console.log(`${resultDelete.rowCount} logs deletados com sucesso!`);

    // Verify
    const resultAfter = await client.query(`SELECT COUNT(*) FROM public.audit_logs;`);
    console.log(`Logs restantes: ${resultAfter.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main();
