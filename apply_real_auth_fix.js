const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

const fixSql = `
CREATE OR REPLACE FUNCTION public.admin_create_user(
    admin_email text, 
    new_email text, 
    new_password text, 
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
    new_user_id UUID;
    group_uuid UUID;
    lower_email TEXT;
BEGIN
    lower_email := lower(new_email);

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
            RAISE EXCEPTION 'Apenas administradores podem criar usuários';
        END IF;
    END IF;

    -- 2. Obter ID do grupo
    SELECT id INTO group_uuid FROM public.user_groups WHERE name = group_name LIMIT 1;
    IF group_uuid IS NULL THEN
        RAISE EXCEPTION 'Grupo não encontrado: %', group_name;
    END IF;

    -- 3. Inserir em auth.users 
    new_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', lower_email,
        crypt(new_password, gen_salt('bf', 10)), now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('name', new_name, 'group_name', group_name),
        now(), now()
    );

    -- 4. Inserir na auth.identities
    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
    ) VALUES (
        gen_random_uuid(), new_user_id, format('{"sub":"%s","email":"%s","email_verified":false,"phone_verified":false}', new_user_id::text, lower_email)::jsonb, 'email', now(), now(), now(), new_user_id::text
    );

    -- O trigger já cria o user_profiles, então só fazemos o UPDATE se houver permissões customizadas
    IF custom_permissions IS NOT NULL THEN
        UPDATE public.user_profiles 
        SET permissions = custom_permissions 
        WHERE id = new_user_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'user_id', new_user_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Drop the other overloaded function if it exists to avoid confusion
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, text);

-- Clean up the broken user again
DELETE FROM public.user_profiles WHERE email = 'instrumentacao@medlifebrasil.com';
DELETE FROM auth.identities WHERE email = 'instrumentacao@medlifebrasil.com';
DELETE FROM auth.users WHERE email = 'instrumentacao@medlifebrasil.com';
`;

async function main() {
  try {
    await client.connect();
    console.log('Applying real fix...');
    await client.query(fixSql);
    console.log('Fix applied successfully.');
  } catch (error) {
    console.error('Error applying fix:', error);
  } finally {
    await client.end();
  }
}

main();
