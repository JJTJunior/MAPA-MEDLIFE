const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

const fixSql = `
CREATE OR REPLACE FUNCTION public.admin_setup_new_user(
    admin_email text, 
    new_user_id uuid,
    new_name text, 
    group_name text, 
    custom_permissions jsonb DEFAULT NULL::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    admin_uid UUID;
    admin_role TEXT;
    group_uuid UUID;
BEGIN
    -- 1. Verificar se quem chama é realmente administrador
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
            RAISE EXCEPTION 'Apenas administradores podem configurar usuários';
        END IF;
    END IF;

    -- 2. Obter ID do grupo
    SELECT id INTO group_uuid FROM public.user_groups WHERE name = group_name LIMIT 1;
    IF group_uuid IS NULL THEN
        RAISE EXCEPTION 'Grupo não encontrado: %', group_name;
    END IF;

    -- 3. Confirm the email in auth.users
    UPDATE auth.users 
    SET email_confirmed_at = now(),
        raw_user_meta_data = jsonb_build_object('name', new_name, 'group_name', group_name)
    WHERE id = new_user_id;

    -- 4. Update the user_profiles (which was auto-created by the trigger on auth.users)
    UPDATE public.user_profiles 
    SET name = new_name,
        group_id = group_uuid,
        permissions = COALESCE(custom_permissions, permissions)
    WHERE id = new_user_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Clean up the broken user again
DELETE FROM public.user_profiles WHERE email = 'instrumentacao@medlifebrasil.com';
DELETE FROM auth.identities WHERE email = 'instrumentacao@medlifebrasil.com';
DELETE FROM auth.users WHERE email = 'instrumentacao@medlifebrasil.com';
`;

async function main() {
  try {
    await client.connect();
    console.log('Creating admin_setup_new_user...');
    await client.query(fixSql);
    console.log('Function created successfully.');
  } catch (error) {
    console.error('Error applying fix:', error);
  } finally {
    await client.end();
  }
}

main();
