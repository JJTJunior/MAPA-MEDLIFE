-- 1. Criação das tabelas de grupos e perfis
CREATE TABLE IF NOT EXISTS public.user_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir grupos padrão
INSERT INTO public.user_groups (name, description) VALUES
('Administrativo', 'Acesso total e configurações'),
('Estoque', 'Acesso ao módulo de materiais e OPME'),
('Diretoria', 'Acesso total, relatórios gerenciais'),
('Instrumentador', 'Visualização de cirurgias e preenchimento de pós-operatório'),
('Vendedor', 'Acesso às cirurgias do próprio vendedor')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    group_id UUID REFERENCES public.user_groups(id) ON DELETE SET NULL,
    permissions JSONB DEFAULT '{"can_edit": true, "can_view_only": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Logs de Auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_table TEXT NOT NULL,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Função e Trigger para criar perfil automaticamente caso crie usuário manualmente no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, group_id)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name',
    (SELECT id FROM public.user_groups WHERE name = COALESCE(new.raw_user_meta_data->>'group_name', 'Vendedor') LIMIT 1)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove the trigger if it exists before creating it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 4. Função e Triggers de Auditoria para Surgeries
CREATE OR REPLACE FUNCTION public.log_surgery_changes()
RETURNS trigger AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Tenta pegar o UID da requisição do Supabase
  current_user_id := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, target_table, record_id, new_data)
    VALUES (current_user_id, 'INSERT', TG_TABLE_NAME, NEW.id::text, row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, target_table, record_id, old_data, new_data)
    VALUES (current_user_id, 'UPDATE', TG_TABLE_NAME, NEW.id::text, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, target_table, record_id, old_data)
    VALUES (current_user_id, 'DELETE', TG_TABLE_NAME, OLD.id::text, row_to_json(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_surgeries_changes ON public.surgeries;
CREATE TRIGGER audit_surgeries_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.surgeries
  FOR EACH ROW EXECUTE PROCEDURE public.log_surgery_changes();


-- 5. Função RPC Segura para Administradores criarem novos usuários
-- Esta função cria o usuário em auth.users. É necessário a extensão pgcrypto instalada no Supabase.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_create_user(
    admin_email TEXT,
    new_email TEXT,
    new_password TEXT,
    new_name TEXT,
    group_name TEXT,
    custom_permissions JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    admin_uid UUID;
    admin_role TEXT;
    new_user_id UUID;
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

    IF admin_role NOT IN ('Administrativo', 'Diretoria', 'Admin') THEN
        -- Fallback check for emails if user_profiles is not fully populated yet
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
        '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', new_email,
        crypt(new_password, gen_salt('bf')), now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('name', new_name, 'group_name', group_name),
        now(), now()
    );

    -- 4. O profile será criado pelo trigger 'on_auth_user_created', mas precisamos atualizar as permissões extras
    IF custom_permissions IS NOT NULL THEN
        -- Delay a little bit or do it directly if trigger fires synchronously. (In Postgres, it's synchronous)
        UPDATE public.user_profiles 
        SET permissions = custom_permissions 
        WHERE id = new_user_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'user_id', new_user_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
