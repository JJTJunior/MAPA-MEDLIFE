const { Client } = require('pg');
const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function applyTrigger() {
  await client.connect();
  const sql = `
CREATE OR REPLACE FUNCTION public.sync_config_from_surgeries()
RETURNS trigger AS $$
BEGIN
    IF NEW.doctor IS NOT NULL AND btrim(NEW.doctor) <> '' THEN
        INSERT INTO public.medicos (name) VALUES (upper(btrim(NEW.doctor))) ON CONFLICT (name) DO NOTHING;
    END IF;
    
    IF NEW.hospital IS NOT NULL AND btrim(NEW.hospital) <> '' THEN
        INSERT INTO public.hospitais (name) VALUES (upper(btrim(NEW.hospital))) ON CONFLICT (name) DO NOTHING;
    END IF;
    
    IF NEW.insurance IS NOT NULL AND btrim(NEW.insurance) <> '' THEN
        INSERT INTO public.convenios (name) VALUES (upper(btrim(NEW.insurance))) ON CONFLICT (name) DO NOTHING;
    END IF;
    
    IF NEW.material_procedure IS NOT NULL AND btrim(NEW.material_procedure) <> '' THEN
        INSERT INTO public.procedimentos (name) VALUES (upper(btrim(NEW.material_procedure))) ON CONFLICT (name) DO NOTHING;
    END IF;
    
    IF NEW.surgery_code IS NOT NULL AND btrim(NEW.surgery_code) <> '' THEN
        INSERT INTO public.codigos_cirurgia (name) VALUES (upper(btrim(NEW.surgery_code))) ON CONFLICT (name) DO NOTHING;
    END IF;
    
    IF NEW.salesperson IS NOT NULL AND btrim(NEW.salesperson) <> '' THEN
        INSERT INTO public.vendedores (name) VALUES (upper(btrim(NEW.salesperson))) ON CONFLICT (name) DO NOTHING;
    END IF;
    
    IF NEW.instrumentalist1 IS NOT NULL AND btrim(NEW.instrumentalist1) <> '' THEN
        INSERT INTO public.instrumentadores (name) VALUES (upper(btrim(NEW.instrumentalist1))) ON CONFLICT (name) DO NOTHING;
    END IF;

    IF NEW.instrumentalist2 IS NOT NULL AND btrim(NEW.instrumentalist2) <> '' THEN
        INSERT INTO public.instrumentadores (name) VALUES (upper(btrim(NEW.instrumentalist2))) ON CONFLICT (name) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_config_trigger ON public.surgeries;
CREATE TRIGGER sync_config_trigger
  AFTER INSERT OR UPDATE ON public.surgeries
  FOR EACH ROW EXECUTE PROCEDURE public.sync_config_from_surgeries();
  `;
  try {
    await client.query(sql);
    console.log('Trigger successfully applied!');
  } catch (err) {
    console.error('Error applying trigger:', err);
  } finally {
    await client.end();
  }
}
applyTrigger().catch(console.error);
