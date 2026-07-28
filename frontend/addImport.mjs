import fs from 'fs';
import path from 'path';

const filePath = path.join('c:', 'MAPA MEDLIFE', 'frontend', 'src', 'components', 'SurgeryGrid.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add useRef to imports if not there
if (!content.includes('useRef')) {
  content = content.replace(/useState, useEffect([^}]*)} from 'react';/, 'useState, useEffect, useRef$1} from \'react\';');
}

// 2. Add refs and states inside SurgeryGrid component
const stateRegex = /(const \[loading, setLoading\] = useState.*?;\n)/;
const newStates = `
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
`;
content = content.replace(stateRegex, `$1${newStates}`);

// 3. Add handleDownloadTemplate and handleFileUpload before handleExportExcel
const functions = `
  const handleDownloadTemplate = () => {
    const templateData = [{
      'Paciente': 'Nome Exemplo',
      'M\u00e9dico / Buco': 'Dr. Exemplo',
      'Hospital': 'Hospital Exemplo',
      'Data (DD/MM/AAAA)': '30/12/2026',
      'Hora (HH:MM)': '08:30',
      'Status': 'MATERIAL ENTREGUE',
      'Conv\u00eanio': 'Conv\u00eanio X',
      'Tipo de Cirurgia': 'Ortogn\u00e1tica',
      'Material / Procedimento': 'Placa e Parafuso',
      'C\u00f3d. Cirurgia': '12345',
      'Instrumentador 1': 'Inst 1',
      'Instrumentador 2': 'Inst 2',
      'Vendedor': 'VEND1',
      'Observa\u00e7\u00e3o': 'Exemplo de observa\u00e7\u00e3o'
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Importa\u00e7\u00e3o");
    XLSX.writeFile(wb, "Modelo_Importacao_Cirurgias.xlsx");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonData.length === 0) {
        alert('A planilha est\u00e1 vazia.');
        return;
      }

      if (jsonData.length > 1000) {
        alert('O limite s\u00e3o 1000 linhas por importa\u00e7\u00e3o.');
        return;
      }

      const rowsToInsert = [];
      const timeRegex = /^([01]\\d|2[0-3]):([0-5]\\d)$/;

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        let rowDate = row['Data (DD/MM/AAAA)'];
        let formattedDate = '';
        if (rowDate) {
          if (typeof rowDate === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            const dateObj = new Date(excelEpoch.getTime() + rowDate * 86400000);
            formattedDate = dateObj.toISOString().split('T')[0];
          } else {
            const parts = String(rowDate).split('/');
            if (parts.length === 3) {
              formattedDate = \`\${parts[2]}-\${parts[1].padStart(2, '0')}-\${parts[0].padStart(2, '0')}\`;
            }
          }
        }

        if (!formattedDate || isNaN(new Date(formattedDate).getTime())) {
          throw new Error(\`Data inv\u00e1lida na linha \${i + 2}. Formato esperado: DD/MM/AAAA\`);
        }

        let timeStr = String(row['Hora (HH:MM)'] || '');
        if (timeStr && !timeRegex.test(timeStr)) {
          throw new Error(\`Hor\u00e1rio inv\u00e1lido na linha \${i + 2}. Formato esperado: HH:MM\`);
        }

        let statusStr = String(row['Status'] || '').toUpperCase();
        const defaultStatus = 'MATERIAL ENTREGUE';
        const validStatus = statusList.find(s => s.name.toUpperCase() === statusStr) ? statusStr : defaultStatus;
        const validStatusColor = statusList.find(s => s.name.toUpperCase() === validStatus)?.icon || '\u23f3';

        rowsToInsert.push({
          patient: String(row['Paciente'] || ''),
          doctor: String(row['M\u00e9dico / Buco'] || ''),
          hospital: String(row['Hospital'] || ''),
          date: formattedDate,
          time: timeStr,
          status: validStatus,
          status_color: validStatusColor,
          insurance: String(row['Conv\u00eanio'] || ''),
          surgery_type: String(row['Tipo de Cirurgia'] || ''),
          material_procedure: String(row['Material / Procedimento'] || ''),
          surgery_code: String(row['C\u00f3d. Cirurgia'] || ''),
          instrumentalist1: String(row['Instrumentador 1'] || ''),
          instrumentalist2: String(row['Instrumentador 2'] || ''),
          salesperson: String(row['Vendedor'] || ''),
          observation: String(row['Observa\u00e7\u00e3o'] || ''),
          created_at: new Date().toISOString()
        });
      }

      const { error } = await supabase.from('surgeries').insert(rowsToInsert);
      if (error) throw error;

      alert(\`\${rowsToInsert.length} cirurgias importadas com sucesso!\`);
      fetchSurgeries();
    } catch (error) {
      console.error(error);
      alert('Erro ao importar: ' + error.message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
`;
content = content.replace('const handleExportExcel = async () => {', `${functions}\n  const handleExportExcel = async () => {`);

// 4. Add UI Buttons
const uiButtons = `
          {canCreate && (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileUpload} 
              />
              <button 
                className="btn-secondary" 
                title="Baixar Modelo de Importa\u00e7\u00e3o"
                onClick={handleDownloadTemplate}
                style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#374151', color: '#fff', border: 'none' }}
              >
                <Download size={18} />
                <span>Modelo XLSX</span>
              </button>
              
              <button 
                className="btn-primary" 
                title="Importar Planilha"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#10b981' }}
              >
                {isImporting ? <Clock className="animate-spin" size={18} /> : <FileText size={18} />}
                <span>{isImporting ? 'Importando...' : 'Importar Planilha'}</span>
              </button>
            </>
          )}
`;

content = content.replace('          <button \n            className="btn-secondary" \n            title="Alternar', `${uiButtons}\n          <button \n            className="btn-secondary" \n            title="Alternar`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SurgeryGrid.jsx modified successfully for imports.');
