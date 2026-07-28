const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

const fixSql = `
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    admin_email text, 
    target_email text, 
    new_password_hash text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    admin_uid UUID;
    admin_role TEXT;
    target_uid UUID;
BEGIN
    -- 1. Check admin
    SELECT id INTO admin_uid FROM auth.users WHERE email = admin_email;
    IF admin_uid IS NULL OR auth.uid() != admin_uid THEN
        RAISE EXCEPTION 'Não autorizado';
    END IF;

    SELECT ug.name INTO admin_role 
    FROM public.user_profiles up
    JOIN public.user_groups ug ON up.group_id = ug.id
    WHERE up.id = admin_uid;

    IF admin_role NOT IN ('Administrativo', 'Diretoria', 'Admin', 'TI') THEN
        IF admin_email NOT LIKE '%admin%' AND admin_email NOT LIKE '%ti@%' AND admin_email NOT LIKE '%rh@%' THEN
            RAISE EXCEPTION 'Apenas administradores podem resetar senhas';
        END IF;
    END IF;

    -- 2. Check target user
    SELECT id INTO target_uid FROM auth.users WHERE email = target_email;
    IF target_uid IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado: %', target_email;
    END IF;

    -- 3. Update password in auth.users
    UPDATE auth.users 
    SET encrypted_password = new_password_hash, updated_at = now()
    WHERE id = target_uid;

    -- 4. Set require_password_change in permissions in user_profiles
    UPDATE public.user_profiles 
    SET permissions = COALESCE(permissions, '{}'::jsonb) || '{"require_password_change": true}'::jsonb
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
    console.log('Creating admin_reset_user_password...');
    await client.query(fixSql);
    console.log('Function created successfully.');
  } catch (error) {
    console.error('Error applying fix:', error);
  } finally {
    await client.end();
  }
}
main();
