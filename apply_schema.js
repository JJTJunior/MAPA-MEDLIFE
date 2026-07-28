const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// URL encode password since it contains special characters
const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected.');

    const sqlFilePath = path.join(__dirname, 'schema_updates.sql');
    console.log(`Reading SQL from ${sqlFilePath}`);
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Executing SQL...');
    await client.query(sql);
    console.log('Schema updates applied successfully!');
  } catch (error) {
    console.error('Error applying schema updates:', error);
  } finally {
    await client.end();
  }
}

main();
