const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

const fixSql = `
CREATE OR REPLACE FUNCTION public.clear_require_password_change(target_uid UUID)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF auth.uid() != target_uid THEN
        RAISE EXCEPTION 'Não autorizado';
    END IF;

    UPDATE public.user_profiles 
    SET permissions = permissions - 'require_password_change'
    WHERE id = target_uid;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
`;

async function main() {
  try {
    await client.connect();
    console.log('Creating clear_require_password_change...');
    await client.query(fixSql);
    console.log('Function created successfully.');
  } catch (error) {
    console.error('Error applying fix:', error);
  } finally {
    await client.end();
  }
}
main();
