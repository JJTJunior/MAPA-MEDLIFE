DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN 
        SELECT unnest(ARRAY['vendedores', 'instrumentadores', 'hospitais', 'convenios', 'procedimentos', 'codigos_cirurgia', 'status', 'surgery_types'])
    LOOP
        BEGIN
            EXECUTE format('CREATE POLICY "Enable update for all users" ON public.%I FOR UPDATE USING (true);', t);
        EXCEPTION
            WHEN duplicate_object THEN
                -- Policy already exists, do nothing
                NULL;
        END;
    END LOOP;
END $$;
