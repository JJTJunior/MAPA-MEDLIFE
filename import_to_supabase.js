const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Carregar credenciais
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERRO: SUPABASE_URL e SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY precisam estar configurados no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const filePath = path.join(__dirname, 'MAPA_CIRURGICO_MEDLIFE.xlsx');
if (!fs.existsSync(filePath)) {
  console.error(`ERRO: Planilha não encontrada em ${filePath}`);
  process.exit(1);
}

console.log('Iniciando leitura do arquivo Excel...');
const workbook = xlsx.readFile(filePath);
console.log('Abas encontradas:', workbook.SheetNames);

// Funções Auxiliares para tratar datas e horas do Excel
function parseExcelDate(val) {
  if (typeof val === 'number') {
    // Conversão de data serial do Excel (1899-12-30)
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    const s = val.trim();
    // Tenta DD/MM/YYYY
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }
    // Tenta YYYY-MM-DD
    const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymd) {
      return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
    }
  }
  return null;
}

function parseExcelTime(val) {
  if (typeof val === 'number') {
    const totalSeconds = Math.round(val * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  if (typeof val === 'string') {
    const s = val.trim();
    const timeMatch = s.match(/^(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    }
  }
  return '';
}

function cleanString(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function isRowEmpty(row) {
  if (!row || row.length === 0) return true;
  return row.every(cell => cell === undefined || cell === null || String(cell).trim() === '');
}

// Mapeamento de Status
function mapStatus(statusText, statusColor, observation) {
  const obs = cleanString(observation).toUpperCase();
  const st = cleanString(statusText).toUpperCase();
  const color = cleanString(statusColor);

  // Verificações com base na observação ou cor
  if (st.includes('SUSP') || color === '🔴' || obs.includes('SUSPENSA') || obs.includes('SUSPENSO')) {
    return { name: 'Suspensa', color: '🔴' };
  }
  if (st.includes('URG') || color === '🔵' || obs.includes('URGÊNCIA') || obs.includes('URGENCIA')) {
    return { name: 'Urgência', color: '🔵' };
  }
  if (st.includes('EM SEP') || color === '🟡' || obs.includes('SEPARAÇÃO') || obs.includes('SEPARACAO')) {
    return { name: 'Em separação', color: '🟡' };
  }
  if (st.includes('SEP. ENT') || color === '🟠' || obs.includes('SEPARADO PARA ENTREGA')) {
    return { name: 'Separado para entrega', color: '🟠' };
  }
  if (st.includes('AG. AUT') || color === '🟣' || obs.includes('AGUARDANDO AUTORIZAÇÃO') || obs.includes('AGUARDANDO AUTORIZACAO')) {
    return { name: 'Aguardando autorização', color: '🟣' };
  }
  if (color === '🟢' || st.includes('ENTREGUE') || obs.includes('ENTREGUE')) {
    return { name: 'Material entregue', color: '🟢' };
  }
  
  // Default baseados no emoji de status
  if (color === '🟢') return { name: 'Material entregue', color: '🟢' };
  if (color === '🔴') return { name: 'Suspensa', color: '🔴' };
  if (color === '🟡') return { name: 'Em separação', color: '🟡' };
  if (color === '🟠') return { name: 'Separado para entrega', color: '🟠' };
  if (color === '🔵') return { name: 'Urgência', color: '🔵' };
  if (color === '🟣') return { name: 'Aguardando autorização', color: '🟣' };

  return { name: 'Material entregue', color: '🟢' }; // default
}

async function run() {
  let allSurgeries = [];

  for (const sheetName of workbook.SheetNames) {
    // Ignorar abas auxiliares se houver, mas todas no formato MMYYYY parecem corretas
    if (!/^\d{6}$/.test(sheetName)) {
      console.log(`Pulando aba não-padrão: ${sheetName}`);
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Lendo aba ${sheetName}: ${data.length} linhas encontradas`);

    // Detectar linha de cabeçalhos
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(data.length, 25); i++) {
      const row = data[i] || [];
      if (row.some(cell => typeof cell === 'string' && (cell.includes('Paciente') || cell.includes('Médico')))) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      console.log(`[Aba ${sheetName}] Cabeçalho não encontrado nas primeiras 25 linhas, pulando...`);
      continue;
    }

    const headers = data[headerRowIndex];
    console.log(`[Aba ${sheetName}] Cabeçalho detectado na linha ${headerRowIndex}`);

    // Identificar estrutura
    const isNewStructure = sheetName >= '052026' || headers[0] === '⚫';
    
    let parsedCount = 0;

    for (let r = headerRowIndex + 1; r < data.length; r++) {
      const row = data[r] || [];
      if (isRowEmpty(row)) continue;

      let surgery = {
        sheet_name: sheetName
      };

      if (isNewStructure) {
        // Nova Estrutura (052026 em diante)
        const statusColor = cleanString(row[0]) || '🟢';
        const dateVal = parseExcelDate(row[1]);
        const timeVal = parseExcelTime(row[2]);
        const doctor = cleanString(row[3]);
        const hospital = cleanString(row[4]);
        const patient = cleanString(row[5]);
        const insurance = cleanString(row[6]);
        const material = cleanString(row[7]);
        const statusText = cleanString(row[8]);
        const observation = cleanString(row[9]);
        const surgeryCode = cleanString(row[10]);
        
        // Checklist de Entregas (Col 11=OPME-status, Col 13=CME-status, Col 15=BLOCO-status)
        const opmeChecked = cleanString(row[11]) === '🟢';
        const cmeChecked = cleanString(row[13]) === '🟢';
        const blocoChecked = cleanString(row[15]) === '🟢';
        
        // Pós (Col 17)
        const posVal = cleanString(row[17]);
        const posChecked = posVal === 'true' || posVal === 'OK' || posVal === '1';
        
        const instrumentalist = cleanString(row[18]);
        const salesperson = cleanString(row[19]);

        // Tratar Status
        const statusMapped = mapStatus(statusText, statusColor, observation);

        // Se não tiver dados mínimos como Paciente ou Médico, pular
        if (!patient && !doctor) continue;

        surgery.status_color = statusMapped.color;
        surgery.status = statusMapped.name;
        surgery.date = dateVal;
        surgery.time = timeVal;
        surgery.doctor = doctor;
        surgery.hospital = hospital;
        surgery.patient = patient;
        surgery.insurance = insurance;
        surgery.material_procedure = material;
        surgery.observation = observation;
        surgery.surgery_code = surgeryCode;
        surgery.delivery_status = statusMapped.color;
        surgery.opme_checked = opmeChecked;
        surgery.cme_checked = cmeChecked;
        surgery.bloco_checked = blocoChecked;
        surgery.pos_checked = posChecked;
        surgery.instrumentalist = instrumentalist;
        surgery.salesperson = salesperson;

      } else {
        // Estrutura Antiga (072025 a 042026)
        // Col 0: Data, Col 1: Hora, Col 2: Médico, Col 3: Hospital, Col 4: Paciente, Col 5: Convenio, Col 6: Material, Col 7: Observação
        // Col 8: Cód. Cirurgia, Col 9: OPME, Col 10: CME, Col 11: BLOCO, Col 12: Pós, Col 13: Instrumentador (se houver), Col 14: Vendedor
        const dateVal = parseExcelDate(row[0]);
        const timeVal = parseExcelTime(row[1]);
        const doctor = cleanString(row[2]);
        const hospital = cleanString(row[3]);
        const patient = cleanString(row[4]);
        const insurance = cleanString(row[5]);
        const material = cleanString(row[6]);
        const observation = cleanString(row[7]);
        const surgeryCode = cleanString(row[8]);
        
        // OPME/CME/BLOCO na estrutura antiga tinham valores string como 'OPME', 'CME', 'BLOCO' se marcados
        const opmeChecked = cleanString(row[9]) === 'OPME';
        const cmeChecked = cleanString(row[10]) === 'CME';
        const blocoChecked = cleanString(row[11]) === 'BLOCO';
        
        const posVal = cleanString(row[12]);
        const posChecked = posVal === 'OK' || posVal === 'true' || posVal === '1';

        // Em algumas tabelas antigas, Instrumentador está na Col 13 e Vendedor na Col 14. Em outras, apenas Vendedor na Col 13.
        let instrumentalist = '';
        let salesperson = '';
        
        if (headers.length > 14 && headers[13] && String(headers[13]).includes('Instrumentador')) {
          instrumentalist = cleanString(row[13]);
          salesperson = cleanString(row[14]);
        } else {
          salesperson = cleanString(row[13]);
        }

        if (!patient && !doctor) continue;

        const statusMapped = mapStatus('', '🟢', observation);

        surgery.status_color = statusMapped.color;
        surgery.status = statusMapped.name;
        surgery.date = dateVal;
        surgery.time = timeVal;
        surgery.doctor = doctor;
        surgery.hospital = hospital;
        surgery.patient = patient;
        surgery.insurance = insurance;
        surgery.material_procedure = material;
        surgery.observation = observation;
        surgery.surgery_code = surgeryCode;
        surgery.delivery_status = statusMapped.color;
        surgery.opme_checked = opmeChecked;
        surgery.cme_checked = cmeChecked;
        surgery.bloco_checked = blocoChecked;
        surgery.pos_checked = posChecked;
        surgery.instrumentalist = instrumentalist;
        surgery.salesperson = salesperson;
      }

      allSurgeries.push(surgery);
      parsedCount++;
    }

    console.log(`[Aba ${sheetName}] Total de registros processados: ${parsedCount}`);
  }

  console.log(`\nProcessamento concluído. Total de cirurgias prontas para migrar: ${allSurgeries.length}`);
  
  if (allSurgeries.length === 0) {
    console.log('Nenhuma cirurgia encontrada para importar.');
    return;
  }

  console.log('Conectando ao Supabase para iniciar upload...');
  
  // Fazer o upload em lotes de 500 registros para evitar sobrecarga na API
  const batchSize = 500;
  let totalUploaded = 0;

  for (let i = 0; i < allSurgeries.length; i += batchSize) {
    const batch = allSurgeries.slice(i, i + batchSize);
    console.log(`Carregando lote ${Math.floor(i / batchSize) + 1} (${batch.length} registros)...`);

    const { error } = await supabase
      .from('surgeries')
      .insert(batch);

    if (error) {
      console.error(`Erro ao inserir lote ${Math.floor(i / batchSize) + 1}:`, error);
      console.log('Abortando migração.');
      return;
    }

    totalUploaded += batch.length;
    console.log(`Lote inserido com sucesso. Total carregado até agora: ${totalUploaded}/${allSurgeries.length}`);
  }

  console.log('\n======================================================');
  console.log(`MIGRAÇÃO CONCLUÍDA COM SUCESSO!`);
  console.log(`Total de cirurgias carregadas no Supabase: ${totalUploaded}`);
  console.log('======================================================');
}

run().catch(console.error);
