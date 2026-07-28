const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

const fixSql = `
CREATE OR REPLACE FUNCTION public.admin_update_user_email(
    admin_email text, 
    target_user_id uuid,
    new_email text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    admin_uid UUID;
    admin_role TEXT;
BEGIN
    -- 1. Verificar se quem chama é administrador
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
            RAISE EXCEPTION 'Apenas administradores podem editar usuários';
        END IF;
    END IF;

    -- 2. Verificar se o novo email já existe em outro usuário
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email AND id != target_user_id) THEN
        RAISE EXCEPTION 'Este e-mail já está em uso por outro usuário';
    END IF;

    -- 3. Atualizar email em auth.users
    UPDATE auth.users 
    SET email = new_email
    WHERE id = target_user_id;

    -- 4. Atualizar email na identidade principal do usuário (SEM a coluna email, pois é GENERATED)
    UPDATE auth.identities
    SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(new_email))
    WHERE user_id = target_user_id AND provider = 'email';

    -- 5. Atualizar perfil
    UPDATE public.user_profiles
    SET email = new_email
    WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
`;

async function main() {
  try {
    await client.connect();
    console.log('Updating admin_update_user_email...');
    await client.query(fixSql);
    console.log('Function updated successfully.');
  } catch (error) {
    console.error('Error applying fix:', error);
  } finally {
    await client.end();
  }
}
main();
