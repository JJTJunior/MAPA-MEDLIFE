const { Client } = require('pg');

// Conexão direta ao PostgreSQL do Supabase
// O formato da connection string do Supabase é:
// postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
const projectRef = 'yslaetfxnsdgntqiqbxa';

// A senha do PostgreSQL é a senha definida no projeto Supabase
// Normalmente a service_role_key NÃO é a senha do DB. 
// Precisamos da senha do database que o usuário definiu ao criar o projeto.

// Alternativa: usar a transaction pooler connection string
// que está disponível em Settings > Database no dashboard do Supabase

// Vamos tentar a conexão padrão do Supabase
const connectionString = `postgresql://postgres.${projectRef}:sb_secret_93cqyZ2dE4oTRGhprRplhw_DRgno5M3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;

console.log('Tentando conectar ao PostgreSQL do Supabase...');

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log('Conectado ao PostgreSQL!');
    
    // Verificar status atual do RLS
    const rlsCheck = await client.query(`
      SELECT relrowsecurity 
      FROM pg_class 
      WHERE relname = 'surgeries';
    `);
    console.log('RLS habilitado?', rlsCheck.rows[0]?.relrowsecurity);
    
    // Verificar policies existentes
    const policies = await client.query(`
      SELECT policyname, cmd, qual 
      FROM pg_policies 
      WHERE tablename = 'surgeries';
    `);
    console.log('Policies existentes:', policies.rows);
    
    if (rlsCheck.rows[0]?.relrowsecurity) {
      console.log('\nRLS está HABILITADO. Criando policies permissivas...');
      
      // Dropar policies existentes primeiro (se houver)
      try {
        await client.query(`DROP POLICY IF EXISTS "allow_select_all" ON public.surgeries;`);
        await client.query(`DROP POLICY IF EXISTS "allow_insert_authenticated" ON public.surgeries;`);
        await client.query(`DROP POLICY IF EXISTS "allow_update_authenticated" ON public.surgeries;`);
        await client.query(`DROP POLICY IF EXISTS "allow_delete_authenticated" ON public.surgeries;`);
        await client.query(`DROP POLICY IF EXISTS "allow_anon_select" ON public.surgeries;`);
      } catch(e) { /* ignora */ }
      
      // Criar policies permissivas
      await client.query(`CREATE POLICY "allow_anon_select" ON public.surgeries FOR SELECT TO anon USING (true);`);
      await client.query(`CREATE POLICY "allow_select_all" ON public.surgeries FOR SELECT TO authenticated USING (true);`);
      await client.query(`CREATE POLICY "allow_insert_authenticated" ON public.surgeries FOR INSERT TO authenticated WITH CHECK (true);`);
      await client.query(`CREATE POLICY "allow_update_authenticated" ON public.surgeries FOR UPDATE TO authenticated USING (true);`);
      await client.query(`CREATE POLICY "allow_delete_authenticated" ON public.surgeries FOR DELETE TO authenticated USING (true);`);
      
      console.log('Policies criadas com sucesso!');
    } else {
      console.log('\nRLS está DESABILITADO. Nenhuma ação necessária.');
    }
    
    // Verificar novamente
    const policiesAfter = await client.query(`
      SELECT policyname, cmd 
      FROM pg_policies 
      WHERE tablename = 'surgeries';
    `);
    console.log('\nPolicies depois da correção:', policiesAfter.rows);
    
  } catch (err) {
    console.error('Erro:', err.message);
    
    if (err.message.includes('password authentication failed') || err.message.includes('SASL')) {
      console.log('\n=== A senha do banco de dados é diferente da service_role_key ===');
      console.log('Você precisa executar o SQL manualmente no Supabase Dashboard:');
      console.log('URL: https://supabase.com/dashboard/project/yslaetfxnsdgntqiqbxa/sql/new');
      console.log('\nCopie e cole este SQL:');
      console.log(`
CREATE POLICY "allow_anon_select" ON public.surgeries FOR SELECT TO anon USING (true);
CREATE POLICY "allow_select_all" ON public.surgeries FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_insert_authenticated" ON public.surgeries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "allow_update_authenticated" ON public.surgeries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "allow_delete_authenticated" ON public.surgeries FOR DELETE TO authenticated USING (true);
      `);
    }
  } finally {
    await client.end();
  }
}

main();
