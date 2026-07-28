const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

const fixSql = `
CREATE OR REPLACE FUNCTION public.admin_create_user(
    new_email text,
    new_password text,
    new_name text,
    group_name text
) RETURNS uuid AS $$
DECLARE
    new_user_id uuid;
    lower_email text;
BEGIN
    new_user_id := gen_random_uuid();
    lower_email := lower(new_email);

    -- Insert into auth.users using cost 10 for bcrypt!
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

    -- Insert into auth.identities
    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
    ) VALUES (
        gen_random_uuid(), new_user_id, format('{"sub":"%s","email":"%s","email_verified":false,"phone_verified":false}', new_user_id::text, lower_email)::jsonb, 'email', now(), now(), now(), new_user_id::text
    );

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove the broken user so the user can register it again
DELETE FROM public.user_profiles WHERE email = 'instrumentacao@medlifebrasil.com';
DELETE FROM auth.users WHERE email = 'instrumentacao@medlifebrasil.com';
`;

async function main() {
  try {
    await client.connect();
    console.log('Applying final fix...');
    await client.query(fixSql);
    console.log('Fix applied successfully.');
  } catch (error) {
    console.error('Error applying fix:', error);
  } finally {
    await client.end();
  }
}

main();
