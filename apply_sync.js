const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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

    const sqlFilePath = path.join(__dirname, 'sync_existing_users.sql');
    console.log(`Reading SQL from ${sqlFilePath}`);
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Executing SQL to sync users...');
    await client.query(sql);
    console.log('Users synced successfully!');
  } catch (error) {
    console.error('Error syncing users:', error);
  } finally {
    await client.end();
  }
}

main();
