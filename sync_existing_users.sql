-- Sincronizar usuários existentes do Supabase Auth para a nova tabela de perfis
INSERT INTO public.user_profiles (id, email, name, group_id, permissions)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'name', UPPER(split_part(au.email, '@', 1))),
    (SELECT id FROM public.user_groups WHERE name = COALESCE(au.raw_user_meta_data->>'group_name', 
        CASE 
            WHEN au.email LIKE '%admin%' OR au.email LIKE '%ti@%' OR au.email LIKE '%rh@%' THEN 'Administrativo'
            WHEN au.email LIKE '%gerente%' THEN 'Diretoria'
            ELSE 'Vendedor'
        END
    ) LIMIT 1),
    '{"can_edit": true, "can_view_only": false}'::jsonb
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
);
