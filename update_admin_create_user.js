const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

const fixSql = `
DROP FUNCTION IF EXISTS public.admin_create_user(text,text,text,text,text,jsonb);

CREATE OR REPLACE FUNCTION public.admin_create_user(
    admin_email text, 
    new_email text, 
    new_password_hash text, 
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
    new_uid UUID;
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
            RAISE EXCEPTION 'Apenas administradores podem criar usuários';
        END IF;
    END IF;

    -- 2. Verificar se o e-mail já existe
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
        RAISE EXCEPTION 'O e-mail % já está em uso', new_email;
    END IF;

    -- 3. Obter ID do grupo
    SELECT id INTO group_uuid FROM public.user_groups WHERE name = group_name LIMIT 1;
    IF group_uuid IS NULL THEN
        RAISE EXCEPTION 'Grupo não encontrado: %', group_name;
    END IF;

    -- 4. Criar o usuário no auth.users
    new_uid := gen_random_uuid();
    
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, 
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_uid, 'authenticated', 'authenticated', new_email,
      new_password_hash,
      now(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('name', new_name, 'group_name', group_name),
      now(), now()
    );

    -- 5. Criar identidade em auth.identities
    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), new_uid::text, new_uid,
      jsonb_build_object('sub', new_uid::text, 'email', new_email, 'email_verified', false, 'phone_verified', false),
      'email', now(), now(), now()
    );

    -- 6. Criar ou atualizar perfil
    -- (Nota: A trigger on_auth_user_created pode já ter criado o perfil, vamos atualizar)
    UPDATE public.user_profiles 
    SET name = new_name, group_id = group_uuid, permissions = custom_permissions 
    WHERE id = new_uid;
    
    IF NOT FOUND THEN
      INSERT INTO public.user_profiles (id, email, name, group_id, permissions)
      VALUES (new_uid, new_email, new_name, group_uuid, custom_permissions);
    END IF;

    RETURN jsonb_build_object('success', true, 'user_id', new_uid);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
`;

async function main() {
  try {
    await client.connect();
    console.log('Updating admin_create_user...');
    await client.query(fixSql);
    console.log('Function updated successfully.');
  } catch (error) {
    console.error('Error applying fix:', error);
  } finally {
    await client.end();
  }
}
main();
