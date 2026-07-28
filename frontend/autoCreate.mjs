import fs from 'fs';
import path from 'path';

const filePath = path.join('c:', 'MAPA MEDLIFE', 'frontend', 'src', 'components', 'SurgeryGrid.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const injection = `
        const newEntries = {
          medicos: new Set(),
          hospitais: new Set(),
          convenios: new Set(),
          surgery_types: new Set(),
          procedimentos: new Set(),
          codigos_cirurgia: new Set(),
          instrumentadores: new Set(),
          vendedores: new Set()
        };

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row['M\\u00e9dico / Buco']) newEntries.medicos.add(String(row['M\\u00e9dico / Buco']).trim());
          if (row['Hospital']) newEntries.hospitais.add(String(row['Hospital']).trim());
          if (row['Conv\\u00eanio']) newEntries.convenios.add(String(row['Conv\\u00eanio']).trim());
          if (row['Tipo de Cirurgia']) newEntries.surgery_types.add(String(row['Tipo de Cirurgia']).trim());
          if (row['Material / Procedimento']) newEntries.procedimentos.add(String(row['Material / Procedimento']).trim());
          if (row['C\\u00f3d. Cirurgia']) newEntries.codigos_cirurgia.add(String(row['C\\u00f3d. Cirurgia']).trim());
          if (row['Instrumentador 1']) newEntries.instrumentadores.add(String(row['Instrumentador 1']).trim());
          if (row['Instrumentador 2']) newEntries.instrumentadores.add(String(row['Instrumentador 2']).trim());
          if (row['Vendedor']) newEntries.vendedores.add(String(row['Vendedor']).trim());
        }

        // Helper function to insert new items
        const syncTable = async (tableName, itemsSet) => {
          if (itemsSet.size === 0) return;
          const items = Array.from(itemsSet).filter(i => i);
          
          const { data: existingData } = await supabase.from(tableName).select('name');
          const existingNames = new Set((existingData || []).map(d => d.name));
          
          const toInsert = items.filter(name => !existingNames.has(name)).map(name => ({ name }));
          
          if (toInsert.length > 0) {
            await supabase.from(tableName).insert(toInsert);
          }
        };

        await Promise.all([
          syncTable('medicos', newEntries.medicos),
          syncTable('hospitais', newEntries.hospitais),
          syncTable('convenios', newEntries.convenios),
          syncTable('surgery_types', newEntries.surgery_types),
          syncTable('procedimentos', newEntries.procedimentos),
          syncTable('codigos_cirurgia', newEntries.codigos_cirurgia),
          syncTable('instrumentadores', newEntries.instrumentadores),
          syncTable('vendedores', newEntries.vendedores)
        ]);

        const { error } = await supabase.from('surgeries').insert(rowsToInsert);`;

content = content.replace("const { error } = await supabase.from('surgeries').insert(rowsToInsert);", injection);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Injected auto-create for dropdown tables.');
