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
    
    // 1. Rename the existing function and the trigger on 'surgeries' table if it hasn't been renamed yet
    try {
      await client.query(`ALTER FUNCTION public.log_surgery_changes() RENAME TO log_audit_changes;`);
      await client.query(`ALTER TRIGGER audit_surgeries_changes ON public.surgeries RENAME TO audit_changes;`);
      console.log('Function and trigger renamed successfully.');
    } catch (e) {
      // Might already be renamed or doesn't exist, just log
      console.log('Function might already be renamed:', e.message);
    }
    
    // 2. Add triggers for all other tables
    const sql = `
      DO $$ 
      DECLARE
          tbl text;
      BEGIN
          FOR tbl IN SELECT unnest(ARRAY[
              'vendedores', 'medicos', 'instrumentadores', 'hospitais', 'convenios', 
              'surgery_types', 'procedimentos', 'codigos_cirurgia', 'status', 
              'funcionarios', 'user_profiles', 'user_groups'
          ]) LOOP
              EXECUTE format('DROP TRIGGER IF EXISTS audit_changes ON public.%I;', tbl);
              EXECUTE format('CREATE TRIGGER audit_changes
                              AFTER INSERT OR UPDATE OR DELETE ON public.%I
                              FOR EACH ROW EXECUTE PROCEDURE public.log_audit_changes();', tbl);
          END LOOP;
      END $$;
    `;
    
    await client.query(sql);
    console.log('Audit triggers successfully applied to all tables!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main();
