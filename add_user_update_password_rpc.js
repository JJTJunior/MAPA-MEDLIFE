const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

const sql = `
CREATE OR REPLACE FUNCTION public.user_update_password(new_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    uid uuid;
    perms jsonb;
BEGIN
    uid := auth.uid();
    IF uid IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    -- Update password
    UPDATE auth.users 
    SET encrypted_password = crypt(new_password, gen_salt('bf', 10)), updated_at = now()
    WHERE id = uid;

    -- Clear require_password_change flag
    SELECT permissions INTO perms FROM public.user_profiles WHERE id = uid;
    IF perms IS NOT NULL THEN
        perms := perms - 'require_password_change';
        UPDATE public.user_profiles 
        SET permissions = perms
        WHERE id = uid;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;
`;

async function applyTrigger() {
  await client.connect();
  try {
    await client.query(sql);
    console.log('RPC successfully applied!');
  } catch (err) {
    console.error('Error applying RPC:', err);
  } finally {
    await client.end();
  }
}
applyTrigger().catch(console.error);
