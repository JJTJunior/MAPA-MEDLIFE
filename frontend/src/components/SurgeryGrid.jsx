import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Search, ChevronLeft, ChevronRight, Edit2, Plus, Filter, Check, X, RefreshCw, Clock, Download, ArrowLeft, Printer, FileText, MessageCircle, List, LayoutGrid, Info, Eye, Stethoscope, Building2, CreditCard, User, Smartphone, Calendar, Upload, Activity, Paperclip, Share2, Tag, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

export default function SurgeryGrid({ user, initialFilters, onEditClick, onViewClick, onCreateClick, onBack, onOpenTV }) {
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [surgeries, setSurgeries] = useState([]);
  const [printData, setPrintData] = useState(null); // Para PDF/Impressão
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState('agenda'); // 'full' ou 'agenda'
  const [showFilters, setShowFilters] = useState(false);
  const [shareModalData, setShareModalData] = useState(null);
  const pageSize = viewMode === 'compact' ? 200 : 15;
  
  const tableContainerRef = useRef(null);
  const topScrollRef = useRef(null);
  const touchStartDist = useRef(null);
  const [tableZoom, setTableZoom] = useState(1);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStartDist.current = dist;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && touchStartDist.current !== null) {
        if (e.cancelable) e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const diff = dist - touchStartDist.current;
        setTableZoom(prev => Math.min(Math.max(0.4, prev + diff * 0.005), 1.5));
        touchStartDist.current = dist;
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        touchStartDist.current = null;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // ResizeObserver para a barra de rolagem superior
  useEffect(() => {
    const container = tableContainerRef.current;
    const topScroll = topScrollRef.current;
    if (!container || !topScroll) return;

    const tableEl = container.querySelector('table');
    const dummyDiv = topScroll.firstChild;
    if (!tableEl || !dummyDiv) return;

    // Atualiza a largura da div invisível baseada na tabela real
    const observer = new ResizeObserver(() => {
      dummyDiv.style.width = `${tableEl.offsetWidth}px`;
    });
    observer.observe(tableEl);

    // Como as tabelas podem mudar (ex: viewMode), forçar atualização inicial
    dummyDiv.style.width = `${tableEl.offsetWidth}px`;

    return () => observer.disconnect();
  }, [surgeries, viewMode, tableZoom]);

  const handleTopScroll = (e) => {
    if (tableContainerRef.current && tableContainerRef.current.scrollLeft !== e.target.scrollLeft) {
      tableContainerRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const handleBottomScroll = (e) => {
    if (topScrollRef.current && topScrollRef.current.scrollLeft !== e.target.scrollLeft) {
      topScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const clearFilters = () => {
    setPatientFilter('');
    setDoctorFilter('');
    setHospitalFilter('');
    setInsuranceFilter('');
    setSalespersonFilter('');
    setSelectedStatus('');
    setInstrumentalist1Filter('');
    setInstrumentalist2Filter('');
    setSurgeryTypeFilter('');
    setCaraterFilter('');
    setMissingAnexo2Filter(false);
    
    // Reset dates to current month instead of clearing them
    const today = new Date();
  };

  // Filtros
  const [patientFilter, setPatientFilter] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState(initialFilters?.hospital !== undefined ? initialFilters.hospital : '');
  const [insuranceFilter, setInsuranceFilter] = useState(initialFilters?.insurance !== undefined ? initialFilters.insurance : '');
  const [doctorFilter, setDoctorFilter] = useState(initialFilters?.doctor !== undefined ? initialFilters.doctor : '');
  const [salespersonFilter, setSalespersonFilter] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(initialFilters?.status !== undefined ? initialFilters.status : '');
  const [startDateFilter, setStartDateFilter] = useState(initialFilters?.startDate !== undefined ? initialFilters.startDate : (() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })());
  const [endDateFilter, setEndDateFilter] = useState(initialFilters?.endDate !== undefined ? initialFilters.endDate : '');
  const [instrumentalist1Filter, setInstrumentalist1Filter] = useState('');
  const [instrumentalist2Filter, setInstrumentalist2Filter] = useState('');
  const [surgeryTypeFilter, setSurgeryTypeFilter] = useState(initialFilters?.surgery_type !== undefined ? initialFilters.surgery_type : '');
  const [autoExportAction, setAutoExportAction] = useState(initialFilters?.autoExport !== undefined ? initialFilters.autoExport : null);
  const [noDateOnly, setNoDateOnly] = useState(false);
  const [missingAnexo2Filter, setMissingAnexo2Filter] = useState(initialFilters?.missingAnexo2 !== undefined ? initialFilters.missingAnexo2 : false);
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [instrumentalist1Options, setInstrumentalist1Options] = useState([]);
  const [instrumentalist2Options, setInstrumentalist2Options] = useState([]);
  const [doctorOptions, setDoctorOptions] = useState([]);
  const [hospitalOptions, setHospitalOptions] = useState([]);
  const [insuranceOptions, setInsuranceOptions] = useState([]);
  const [salespersonOptions, setSalespersonOptions] = useState([]);
  const [surgeryTypeOptions, setSurgeryTypeOptions] = useState([]);
  const [caraterFilter, setCaraterFilter] = useState(initialFilters?.carater !== undefined ? initialFilters.carater : '');
  const [caraterOptions, setCaraterOptions] = useState(['ELETIVA', 'URGENCIA', 'JUDICIAL']);
    const [statusList, setStatusList] = useState([
    { icon: '🟢', name: 'MATERIAL ENTREGUE' },
    { icon: '🟡', name: 'EM SEPARACAO' },
    { icon: '🟠', name: 'SEPARADO PARA ENTREGA' },
    { icon: '🟣', name: 'AUTORIZADAS' },
    { icon: '🔵', name: 'URGENCIA' },
    { icon: '🔴', name: 'SUSPENSA' }
  ]);
  const isEditable = user.permissions?.can_view_only ? false : (user.permissions?.can_edit ?? (user.role === 'Admin' || user.role === 'Gerente'));
  const canCreate = user.permissions?.can_view_only ? false : (user.permissions?.allowed_edit_fields?.includes('create_surgery') ?? isEditable);
  const canImport = user.permissions?.can_view_only ? false : (user.permissions?.allowed_edit_fields?.includes('import_surgery') ?? isEditable);
  const isFieldEditable = (fieldName) => {
    if (!isEditable) return false;
    if (user.role === 'Admin' || user.role === 'Gerente') return true;
    const allowed = user.permissions?.allowed_edit_fields;
    if (allowed && Array.isArray(allowed)) {
      return allowed.includes(fieldName);
    }
    return true;
  };

  useEffect(() => {
    fetchStatuses();
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const [instrRes, medRes, hospRes, vendRes, surRes, convRes] = await Promise.all([
        supabase.from('instrumentadores').select('name').order('name', { ascending: true }),
        supabase.from('medicos').select('name').order('name', { ascending: true }),
        supabase.from('hospitais').select('name').order('name', { ascending: true }),
        supabase.from('vendedores').select('name').order('name', { ascending: true }),
        supabase.from('surgery_types').select('name').order('name', { ascending: true }),
        supabase.from('convenios').select('name').order('name', { ascending: true })
      ]);
      
      if (instrRes.data) {
        const options = instrRes.data.map(i => i.name).filter(Boolean);
        setInstrumentalist1Options(options);
        setInstrumentalist2Options(options);
      }
      if (medRes.data) setDoctorOptions(medRes.data.map(i => i.name ? i.name.split('|CRM:')[0] : '').filter(Boolean));
      if (hospRes.data) setHospitalOptions(hospRes.data.map(i => i.name).filter(Boolean));
      if (vendRes.data) setSalespersonOptions(vendRes.data.map(i => i.name).filter(Boolean));
      if (surRes.data) setSurgeryTypeOptions(surRes.data.map(i => i.name).filter(Boolean));
      if (convRes.data) setInsuranceOptions(convRes.data.map(i => i.name).filter(Boolean));
      try {
        const caraterRes = await supabase.from('carater').select('name').order('name', { ascending: true });
        if (caraterRes.data && caraterRes.data.length > 0) {
          setCaraterOptions(caraterRes.data.map(i => i.name).filter(Boolean));
        } else {
          const stored = localStorage.getItem('carater_list');
          if (stored) {
            const parsed = JSON.parse(stored);
            setCaraterOptions(parsed.map(i => i.name).filter(Boolean));
          }
        }
      } catch (e) {
        const stored = localStorage.getItem('carater_list');
        if (stored) {
          const parsed = JSON.parse(stored);
          setCaraterOptions(parsed.map(i => i.name).filter(Boolean));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar opções de filtro:', err);
    }
  };

  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.status !== undefined) setSelectedStatus(initialFilters.status);
      if (initialFilters.hospital !== undefined) setHospitalFilter(initialFilters.hospital);
      if (initialFilters.doctor !== undefined) setDoctorFilter(initialFilters.doctor);
      if (initialFilters.insurance !== undefined) setInsuranceFilter(initialFilters.insurance);
      if (initialFilters.surgery_type !== undefined) setSurgeryTypeFilter(initialFilters.surgery_type);
      if (initialFilters.carater !== undefined) setCaraterFilter(initialFilters.carater);
      if (initialFilters.startDate !== undefined) setStartDateFilter(initialFilters.startDate);
      if (initialFilters.endDate !== undefined) setEndDateFilter(initialFilters.endDate);
      if (initialFilters.autoExport !== undefined) setAutoExportAction(initialFilters.autoExport);
      if (initialFilters.missingAnexo2 !== undefined) setMissingAnexo2Filter(initialFilters.missingAnexo2);
    }
  }, [initialFilters]);

  useEffect(() => {
    setCurrentPage(1); // Resetar página ao mudar filtros
    fetchSurgeries();
  }, [patientFilter, hospitalFilter, doctorFilter, salespersonFilter, surgeryTypeFilter, caraterFilter, selectedStatus, startDateFilter, endDateFilter, instrumentalist1Filter, instrumentalist2Filter, insuranceFilter, user, viewMode, columnFilters, noDateOnly]);

  useEffect(() => {
    fetchSurgeries();
  }, [currentPage]);

  useEffect(() => {
    const channel = supabase
      .channel('grid_surgeries_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'surgeries' }, (payload) => {
        setSurgeries(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'surgeries' }, () => {
        fetchSurgeries();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'surgeries' }, (payload) => {
        setSurgeries(prev => prev.filter(s => s.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!loading && autoExportAction) {
      const action = autoExportAction;
      setAutoExportAction(null); // Clear to avoid loop
      
      setTimeout(() => {
        if (action === 'pdf') {
          handleExportPDF();
        } else if (action === 'excel') {
          handleExportExcel();
        }
      }, 500);
    }
  }, [loading, autoExportAction]);

    const fetchStatuses = async () => {
    try {
      const statusRes = await supabase.from('status').select('name').order('name', { ascending: true });
      if (statusRes.error) throw statusRes.error;
      if (statusRes && statusRes.data && statusRes.data.length > 0) {
        const fetchedStatuses = statusRes.data.map(s => {
          if (s.name.includes('|')) {
            const [icon, name] = s.name.split('|');
            return { icon, name };
          }
          return { icon: '⚪', name: s.name };
        });
        fetchedStatuses.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        setStatusList(fetchedStatuses);
      } else {
        const fallbackStatuses = [
          { icon: '🟡', name: 'AUTORIZADAS' },
          { icon: '⚪', name: 'ELETIVA' },
          { icon: '🔵', name: 'EM SEPARACAO' },
          { icon: '🟢', name: 'MATERIAL ENTREGUE' },
          { icon: '🟠', name: 'SEPARADO PARA ENTREGAR' },
          { icon: '🔴', name: 'SUSPENSA' },
          { icon: '✅', name: 'FINALIZADA' },
          { icon: '🔄', name: 'MATERIAL RETORNADO' },
          { icon: '🟣', name: 'AGENDADA' },
          { icon: '🟣', name: 'URGENCIA' }
        ];
        fallbackStatuses.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        setStatusList(fallbackStatuses);
      }
    } catch (err) {
      console.error('Erro ao carregar status:', err);
    }
  };

  const fetchSurgeries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('surgeries')
        .select('*', { count: 'exact' });

      // 1. Filtro Restritivo por Cargo (Instrumentador e Vendedor)
      if (user?.role === 'Instrumentador' || user?.role === 'Vendedor') {
        query = query.or(`instrumentalist1.eq."${user.name}",instrumentalist2.eq."${user.name}",salesperson.eq."${user.name}"`);
      }

      // 2. Filtro de Busca (Paciente, Médico, Hospital, Vendedor)
      if (patientFilter.trim() !== '') {
        query = query.ilike('patient', `%${patientFilter.trim()}%`);
      }
      if (doctorFilter.trim() !== '') {
        query = query.ilike('doctor', doctorFilter.trim());
      }
      if (hospitalFilter.trim() !== '') {
        query = query.ilike('hospital', hospitalFilter.trim());
      }
      if (insuranceFilter.trim() !== '') {
        query = query.ilike('insurance', insuranceFilter.trim());
      }
      if (salespersonFilter.trim() !== '') {
        query = query.ilike('salesperson', salespersonFilter.trim());
      }

      // 3. Filtro de Status
      if (selectedStatus) {
        query = query.ilike('status', selectedStatus);
      }
// Filtro de Instrumentador
      if (instrumentalist1Filter.trim() !== '') {
        query = query.ilike('instrumentalist1', `%${instrumentalist1Filter.trim()}%`);
      }
      if (instrumentalist2Filter.trim() !== '') {
        query = query.ilike('instrumentalist2', `%${instrumentalist2Filter.trim()}%`);
      }

      // Filtro de Tipo de Cirurgia
      if (surgeryTypeFilter.trim() !== '') {
        query = query.ilike('surgery_type', surgeryTypeFilter.trim());
      }
      if (caraterFilter.trim() !== '') {
        query = query.ilike('carater', caraterFilter.trim());
      }
      if (missingAnexo2Filter) {
        query = query.in('status', ['Material entregue', 'MATERIAL ENTREGUE']);
      }

      // 5. Filtro de Data Inicial e Final
      // 5. Filtro de Data Inicial e Final ou Sem Data
      if (noDateOnly) {
        query = query.is('date', null);
      } else {
        if (startDateFilter) query = query.gte('date', startDateFilter);
        if (endDateFilter) query = query.lte('date', endDateFilter);
      }

      // Filtros Específicos de Coluna
      Object.keys(columnFilters).forEach(col => {
        if (columnFilters[col] && columnFilters[col].trim() !== '') {
          query = query.ilike(col, `%${columnFilters[col].trim()}%`);
        }
      });

      // Ordenar por data crescente e hora
      query = query
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      // Paginação
      let dataResult = [];
      let totalResult = 0;
      
      if (missingAnexo2Filter) {
        // Busca todos e filtra localmente para anexo 2 faltante
        const { data: allData, error: allErr } = await query;
        if (allErr) throw allErr;
        
        const filteredByAnexo2 = (allData || []).filter(item => {
          const anexo2Items = item.comanda_urls && Array.isArray(item.comanda_urls) 
            ? item.comanda_urls.filter(url => !url.includes('anexo=3') && !url.includes('[ANEXO_3]')) 
            : [];
          return anexo2Items.length === 0;
        });
        
        totalResult = filteredByAnexo2.length;
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize;
        dataResult = filteredByAnexo2.slice(from, to);
      } else {
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
        
        const { data, count, error } = await query;
        if (error) throw error;
        
        dataResult = data || [];
        totalResult = count || 0;
      }

      setSurgeries(dataResult);
      setTotalCount(totalResult);
    } catch (err) {
      console.error('Erro ao carregar cirurgias:', err);
    } finally {
      setLoading(false);
    }
  };

  
  const handleDownloadTemplate = () => {
    const templateData = [{
      'Paciente': 'Nome Exemplo',
      'Médico': 'Dr. Exemplo',
      'Hospital': 'Hospital Exemplo',
      'Data (DD/MM/AAAA)': '30/12/2026',
      'Hora (HH:MM)': '08:30',
      'Status': 'MATERIAL ENTREGUE',
      'Convênio': 'Convênio X',
      'Tipo de Cirurgia': 'Ortognática',
      'Material / Procedimento': 'Placa e Parafuso',
      'Cód. Cirurgia': '12345',
        'OPME (Sim/Não)': 'Não',
        'CME (Sim/Não)': 'Não',
        'BLOCO (Sim/Não)': 'Não',
        'PÓS (Sim/Não)': 'Não',
      'Instrumentador 1': 'Inst 1',
      'Instrumentador 2': 'Inst 2',
      'Vendedor': 'VEND1',
      'Observação': 'Exemplo de observação'
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Importação");
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
        alert('A planilha está vazia.');
        return;
      }

      if (jsonData.length > 1000) {
        alert('O limite são 1000 linhas por importação.');
        return;
      }

      const rowsToInsert = [];
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

      for (let i = 0; i < jsonData.length; i++) {
        const rawRow = jsonData[i];
        
        // Normalize keys to lowercase, no accents, no outer spaces
        const row = {};
        for (let key in rawRow) {
          const normKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          row[normKey] = rawRow[key];
        }
        
        const getValByPrefix = (prefix) => {
          const key = Object.keys(row).find(k => k.startsWith(prefix));
          return key ? row[key] : '';
        };

        let rowDate = getValByPrefix('data');
        let formattedDate = '';
        if (rowDate) {
          if (typeof rowDate === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            const dateObj = new Date(excelEpoch.getTime() + rowDate * 86400000);
            formattedDate = dateObj.toISOString().split('T')[0];
          } else {
            const parts = String(rowDate).split('/');
            if (parts.length === 3) {
              formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
        }

        if (!formattedDate || isNaN(new Date(formattedDate).getTime())) {
          throw new Error(`Data inválida na linha ${i + 2}. Formato esperado: DD/MM/AAAA`);
        }

        let timeStr = String(getValByPrefix('hora') || '');
        if (timeStr && !timeRegex.test(timeStr)) {
          throw new Error(`Horário inválido na linha ${i + 2}. Formato esperado: HH:MM`);
        }

        let statusStr = String(row['status'] || '').toUpperCase();
        const defaultStatus = 'MATERIAL ENTREGUE';
        const validStatus = statusList.find(s => s.name.toUpperCase() === statusStr) ? statusStr : defaultStatus;
        const validStatusColor = statusList.find(s => s.name.toUpperCase() === validStatus)?.icon || '⏳';

        
          const opme_val = String(getValByPrefix('opme')).trim().toUpperCase();
          const cme_val = String(getValByPrefix('cme')).trim().toUpperCase();
          const bloco_val = String(getValByPrefix('bloco')).trim().toUpperCase();
          const pos_val = String(getValByPrefix('pos')).trim().toUpperCase();

          const doctorVal = row['medico / buco'] || row['medico/buco'] || row['medico'] || row['medicos'] || '';

          rowsToInsert.push({
            opme_checked: opme_val === 'SIM',
            cme_checked: cme_val === 'SIM',
            bloco_checked: bloco_val === 'SIM',
            pos_checked: pos_val === 'SIM',
          patient: String(row['paciente'] || ''),
          doctor: String(doctorVal),
          hospital: String(row['hospital'] || ''),
          date: formattedDate,
          time: timeStr,
          status: validStatus,
          status_color: validStatusColor,
          insurance: String(row['convenio'] || ''),
          surgery_type: String(row['tipo de cirurgia'] || ''),
          material_procedure: String(row['material / procedimento'] || row['material/procedimento'] || ''),
          surgery_code: String(row['cod. cirurgia'] || row['codigo cirurgia'] || ''),
          instrumentalist1: String(row['instrumentador 1'] || row['instrumentador1'] || ''),
          instrumentalist2: String(row['instrumentador 2'] || row['instrumentador2'] || ''),
          salesperson: String(row['vendedor'] || ''),
          observation: String(row['observacao'] || row['obs'] || ''),
          created_at: new Date().toISOString()
        });
      }

      
        const newEntries = {
          medicos: new Set(),
          hospitais: new Set(),
          convenios: new Set(),
          surgery_types: new Set(),
          procedimentos: new Set(),
          instrumentadores: new Set(),
          vendedores: new Set()
        };

        for (let i = 0; i < jsonData.length; i++) {
          const rawRow = jsonData[i];
          const row = {};
          for (let key in rawRow) {
            const normKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            row[normKey] = rawRow[key];
          }

          const medicoVal = row['medico / buco'] || row['medico/buco'] || row['medico'] || row['medicos'];
          if (medicoVal) newEntries.medicos.add(String(medicoVal).trim());
          if (row['hospital']) newEntries.hospitais.add(String(row['hospital']).trim());
          
          const convenioVal = row['convenio'];
          if (convenioVal) newEntries.convenios.add(String(convenioVal).trim());
          
          if (row['tipo de cirurgia']) newEntries.surgery_types.add(String(row['tipo de cirurgia']).trim());
          
          const matProcVal = row['material / procedimento'] || row['material/procedimento'];
          if (matProcVal) newEntries.procedimentos.add(String(matProcVal).trim());
          
          const codVal = row['cod. cirurgia'] || row['codigo cirurgia'];
          
          const inst1 = row['instrumentador 1'] || row['instrumentador1'];
          if (inst1) newEntries.instrumentadores.add(String(inst1).trim());
          
          const inst2 = row['instrumentador 2'] || row['instrumentador2'];
          if (inst2) newEntries.instrumentadores.add(String(inst2).trim());
          
          if (row['vendedor']) newEntries.vendedores.add(String(row['vendedor']).trim());
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
          syncTable('instrumentadores', newEntries.instrumentadores),
          syncTable('vendedores', newEntries.vendedores)
        ]);

        const { error } = await supabase.from('surgeries').insert(rowsToInsert);
      if (error) throw error;

      alert(`${rowsToInsert.length} cirurgias importadas com sucesso!`);
      fetchSurgeries();
    } catch (error) {
      console.error(error);
      alert('Erro ao importar: ' + error.message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      let query = supabase.from('surgeries').select('*');

      if (user?.role === 'Instrumentador' || user?.role === 'Vendedor') {
        query = query.or(`instrumentalist1.eq."${user.name}",instrumentalist2.eq."${user.name}",salesperson.eq."${user.name}"`);
      }

      if (patientFilter.trim() !== '') query = query.ilike('patient', `%${patientFilter.trim()}%`);
      if (doctorFilter.trim() !== '') query = query.ilike('doctor', doctorFilter.trim());
      if (hospitalFilter.trim() !== '') query = query.ilike('hospital', hospitalFilter.trim());
      if (salespersonFilter.trim() !== '') query = query.ilike('salesperson', salespersonFilter.trim());
      if (surgeryTypeFilter.trim() !== '') query = query.ilike('surgery_type', surgeryTypeFilter.trim());

      if (selectedStatus) query = query.ilike('status', selectedStatus);
      if (noDateOnly) {
        query = query.is('date', null);
      } else {
        if (startDateFilter) query = query.gte('date', startDateFilter);
        if (endDateFilter) query = query.lte('date', endDateFilter);
      }

      // Limite máximo alto para garantir exportação (ex. 10000)
      query = query.order('date', { ascending: true }).order('time', { ascending: true }).limit(10000);

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        alert('Nenhum dado encontrado para exportar com os filtros atuais.');
        return;
      }

      const exportData = data.map(item => ({
        'Status': item.status || '',
        'Data': formatBrazilianDate(item.date),
        'Hora': item.time || '',
        'Médico': item.doctor || '',
        'Hospital': item.hospital || '',
        'Paciente': item.patient || '',
        'Convênio': item.insurance || '',
        'Tipo de Cirurgia': item.surgery_type || '',
        'Caráter': item.carater || '',
        'Material/Procedimento': item.material_procedure || '',
        'Cód. Cirurgia': item.surgery_code || '',
        'OPME': item.opme_checked ? 'Sim' : 'Não',
        'CME': item.cme_checked ? 'Sim' : 'Não',
        'BLOCO': item.bloco_checked ? 'Sim' : 'Não',
        'PÓS': item.pos_checked ? 'Sim' : 'Não',
        'ANEXO 1': ((item.medical_request_urls && item.medical_request_urls.length > 0) || item.attachment_url) ? 'Sim' : 'Não',
          'ANEXO 2': (item.comanda_urls && item.comanda_urls.length > 0) ? 'Sim' : 'Não',
        'Instrumentador 1': item.instrumentalist1 || '',
        'Instrumentador 2': item.instrumentalist2 || '',
        'Vendedor': item.salesperson || '',
        'Observação': item.observation || ''}));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Mapa Cirurgico');
      
      const fileName = `Mapa_Cirurgico_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

    } catch (err) {
      console.error('Erro ao exportar para Excel:', err);
      alert('Ocorreu um erro ao exportar os dados.');
    } finally {
      setIsExporting(false);
    }
  };

  const fetchAllFilteredData = async () => {
    let query = supabase.from('surgeries').select('*');

    if (user?.role === 'Instrumentador' || user?.role === 'Vendedor') {
      query = query.or(`instrumentalist1.eq."${user.name}",instrumentalist2.eq."${user.name}",salesperson.eq."${user.name}"`);
    }

    if (patientFilter.trim() !== '') query = query.ilike('patient', `%${patientFilter.trim()}%`);
    if (doctorFilter.trim() !== '') query = query.ilike('doctor', doctorFilter.trim());
    if (hospitalFilter.trim() !== '') query = query.ilike('hospital', hospitalFilter.trim());
    if (salespersonFilter.trim() !== '') query = query.ilike('salesperson', salespersonFilter.trim());
    if (surgeryTypeFilter.trim() !== '') query = query.ilike('surgery_type', surgeryTypeFilter.trim());
    if (selectedStatus) query = query.eq('status', selectedStatus);
    if (noDateOnly) {
      query = query.is('date', null);
    } else {
      if (startDateFilter) query = query.gte('date', startDateFilter);
      if (endDateFilter) query = query.lte('date', endDateFilter);
    }
    if (instrumentalist1Filter.trim() !== '') query = query.ilike('instrumentalist1', `%${instrumentalist1Filter.trim()}%`);
    if (instrumentalist2Filter.trim() !== '') query = query.ilike('instrumentalist2', `%${instrumentalist2Filter.trim()}%`);

    query = query.order('date', { ascending: true }).order('time', { ascending: true }).limit(5000);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllFilteredData();
      if (!data || data.length === 0) {
        alert('Nenhum dado encontrado para exportar com os filtros atuais.');
        return;
      }
      setPrintData(data);
      
      // Espera o React renderizar a tabela oculta
      setTimeout(() => {
        const element = document.getElementById('print-container');
        if (!element) return;
        
        const opt = {
          margin:       5,
          filename:     `Mapa_Cirurgico_${new Date().toISOString().split('T')[0]}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };
        
        html2pdf().set(opt).from(element).save().then(() => {
          setPrintData(null);
        });
      }, 500);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      alert('Ocorreu um erro ao exportar o PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllFilteredData();
      if (!data || data.length === 0) {
        alert('Nenhum dado para imprimir com os filtros atuais.');
        return;
      }
      setPrintData(data);
      
      // Espera renderizar e chama print
      setTimeout(() => {
        window.print();
        setPrintData(null);
      }, 500);
    } catch (err) {
      console.error('Erro ao imprimir:', err);
      alert('Ocorreu um erro ao imprimir.');
    } finally {
      setIsExporting(false);
    }
  };

  // Função auxiliar para baixar um arquivo de URL e retornar como File
  const downloadFileFromUrl = async (url, filename) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      
      let mimeType = blob.type || '';
      const lowerUrl = url.toLowerCase();
      
      if (!mimeType || mimeType === 'application/octet-stream') {
        if (lowerUrl.includes('.pdf')) mimeType = 'application/pdf';
        else if (lowerUrl.includes('.png')) mimeType = 'image/png';
        else if (lowerUrl.includes('.webp')) mimeType = 'image/webp';
        else mimeType = 'image/jpeg';
      }

      if (mimeType.includes('jpg') || mimeType.includes('jpeg')) mimeType = 'image/jpeg';
      else if (mimeType.includes('pdf')) mimeType = 'application/pdf';
      else if (mimeType.includes('png')) mimeType = 'image/png';

      let extension = 'jpg';
      if (mimeType === 'application/pdf') extension = 'pdf';
      else if (mimeType === 'image/png') extension = 'png';
      else if (mimeType === 'image/jpeg') extension = 'jpg';
      else if (mimeType.includes('word') || mimeType.includes('officedocument')) extension = 'docx';

      const cleanFilename = filename.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const finalName = `${cleanFilename}.${extension}`;
      return new File([blob], finalName, { type: mimeType });
    } catch (err) {
      console.error('Erro ao baixar arquivo para compartilhamento:', err);
      return null;
    }
  };

  const handleShareWhatsApp = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllFilteredData();
      if (!data || data.length === 0) {
        alert('Nenhum dado encontrado para compartilhar com os filtros atuais.');
        return;
      }
      
      let dateHeader = 'Todas as Datas';
      if (startDateFilter && endDateFilter) {
        if (startDateFilter === endDateFilter) {
          dateHeader = formatBrazilianDate(startDateFilter);
        } else {
          dateHeader = `${formatBrazilianDate(startDateFilter)} até ${formatBrazilianDate(endDateFilter)}`;
        }
      } else if (startDateFilter) {
        dateHeader = `A partir de ${formatBrazilianDate(startDateFilter)}`;
      } else if (endDateFilter) {
        dateHeader = `Até ${formatBrazilianDate(endDateFilter)}`;
      }

      // Monta texto completo e coleta arquivos na ordem dos pacientes
      let text = `*MAPA CIRÚRGICO - ${dateHeader}*\n\n`;
      const allFiles = [];

      for (let idx = 0; idx < data.length; idx++) {
        const item = data[idx];
        text += `*${idx + 1}. Paciente:* ${item.patient || 'N/A'}\n`;
        text += `*Data/Hora:* ${formatBrazilianDate(item.date)} ${item.time || ''}\n`;
        text += `*Médico:* ${item.doctor || 'N/A'}\n`;
        text += `*Hospital:* ${item.hospital || 'N/A'}\n`;
        text += `*Mat/Proc:* ${item.material_procedure || 'N/A'}\n`;
        text += `*Status:* ${item.status || 'N/A'}\n`;
        text += `*Instr. 1:* ${item.instrumentalist1 || 'N/A'}\n`;
        if (item.instrumentalist2) text += `*Instr. 2:* ${item.instrumentalist2}\n`;
        text += `*Vendedor:* ${item.salesperson || 'N/A'}\n`;
        if (item.observation) text += `*Obs:* ${item.observation}\n`;

        // Coleta e baixa os anexos deste paciente
        const attachments = [];
        if (item.medical_request_urls && item.medical_request_urls.length > 0) {
          item.medical_request_urls.forEach(att => {
            if (!att) return;
            const url = att.includes('|||') ? att.split('|||')[0] : att;
            const name = att.includes('|||') ? att.split('|||')[1] : 'Anexo';
            attachments.push({ url, name });
          });
        } else if (item.attachment_url) {
          attachments.push({ url: item.attachment_url, name: 'Anexo' });
        }

        if (attachments.length > 0) {
          const attachNames = attachments.map(a => a.name);
          text += `*Anexos:* ${attachNames.join(', ')}\n`;
        }

        text += `\n`;
      }

      // Envia diretamente o texto no WhatsApp sem baixar anexos
      if (navigator.share) {
        try {
          await navigator.share({ text: text });
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      const encodedText = encodeURIComponent(text);
      window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
    } catch (err) {
      console.error('Erro ao compartilhar no WhatsApp:', err);
      alert('Ocorreu um erro ao gerar texto para WhatsApp.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleCheck = async (id, field, currentValue) => {
    const newValue = !currentValue;
    
    // Atualização otimista no estado local para resposta instantânea
    setSurgeries(prev => prev.map(s => s.id === id ? { ...s, [field]: newValue } : s));

    try {
      const { error } = await supabase
        .from('surgeries')
        .update({ [field]: newValue })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao atualizar checklist:', err);
      // Reverter alteração local em caso de erro
      setSurgeries(prev => prev.map(s => s.id === id ? { ...s, [field]: currentValue } : s));
    }
  };

  const getStatusClass = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('entregue')) return 'status-delivered';
    if (s.includes('suspensa')) return 'status-suspended';
    if (s.includes('em separação') || s.includes('separacao') || s.includes('separação')) return 'status-preparing';
    if (s.includes('separado') || s.includes('entrega')) return 'status-ready';
    if (s.includes('urgência') || s.includes('urgencia')) return 'status-urgent';
    if (s.includes('agendada')) return 'status-urgent';
    if (s.includes('aguardando') || s.includes('autorização') || s.includes('autorizacao') || s.includes('autorizada')) return 'status-pending';
    if (s.includes('eletiva')) return 'status-eletiva';
    if (s.includes('retornado')) return 'status-returned';
    return 'status-default';
  };

  const getLegacyIcon = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('entregue')) return '🟢';
    if (s.includes('suspensa')) return '🔴';
    if (s.includes('em separação') || s.includes('separacao') || s.includes('separação')) return '🔵';
    if (s.includes('separado') || s.includes('entrega')) return '🟠';
    if (s.includes('urgência') || s.includes('urgencia')) return '🟣';
    if (s.includes('agendada')) return '🟣';
    if (s.includes('aguardando') || s.includes('autorização') || s.includes('autorizacao') || s.includes('autorizada')) return '🟡';
    if (s.includes('eletiva')) return '⚪';
    if (s.includes('retornado')) return '🔄';
    return '⚪';
  };

  const formatBrazilianDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getReportTitle = () => {
    if (startDateFilter && endDateFilter) {
      if (startDateFilter === endDateFilter) return formatBrazilianDate(startDateFilter);
      return `${formatBrazilianDate(startDateFilter)} a ${formatBrazilianDate(endDateFilter)}`;
    } else if (startDateFilter) {
      return `A partir de ${formatBrazilianDate(startDateFilter)}`;
    } else if (endDateFilter) {
      return `Até ${formatBrazilianDate(endDateFilter)}`;
}
    return 'Todas as Datas';
  };

  const getMonthName = (monthStr) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const idx = parseInt(monthStr, 10) - 1;
    return months[idx] || monthStr;
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const renderFilterableHeader = (title, columnKey, customStyle = {}) => (
    <th style={{ position: 'relative', ...customStyle }} key={columnKey}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span>{title}</span>
        <button 
          className="info-icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            setActiveFilterColumn(activeFilterColumn === columnKey ? null : columnKey);
          }}
          style={{ 
            color: columnFilters[columnKey] ? '#34d399' : 'inherit',
            padding: '2px',
            opacity: columnFilters[columnKey] ? 1 : 0.5
          }}
          title={`Filtrar ${title}`}
        >
          <Filter size={14} />
        </button>
      </div>
      {activeFilterColumn === columnKey && (
        <div 
          className="column-filter-dropdown glass-panel" 
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filtrar {title}</span>
            <input 
              type="text" 
              className="form-input"
              style={{ fontSize: '0.85rem', padding: '6px 10px', minWidth: '160px' }}
              placeholder={`Buscar...`}
              value={columnFilters[columnKey] || ''}
              onChange={(e) => setColumnFilters({...columnFilters, [columnKey]: e.target.value})}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button 
                className="btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                onClick={() => setActiveFilterColumn(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </th>
  );

  const getDayOfWeek = (dateString) => {
    if (!dateString || dateString === 'Sem Data') return '';
    const date = new Date(dateString + 'T12:00:00'); 
    const days = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];
    return days[date.getDay()];
  };

  const formatDateShort = (dateString) => {
    if (!dateString || dateString === 'Sem Data') return '';
    const date = new Date(dateString + 'T12:00:00');
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${String(date.getDate()).padStart(2, '0')} de ${months[date.getMonth()]}`;
  };

  const groupedSurgeries = React.useMemo(() => {
    const groups = surgeries.reduce((acc, surgery) => {
      const dateStr = surgery.date || 'Sem Data';
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(surgery);
      return acc;
    }, {});
    
    // Sort keys logically (Sem Data at the end)
    return Object.keys(groups).sort((a, b) => {
      if (a === 'Sem Data') return 1;
      if (b === 'Sem Data') return -1;
      return a.localeCompare(b);
    }).reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {});
  }, [surgeries]);

  return (
    <div className={viewMode === 'agenda' ? 'agenda-container' : ''}>
      {viewMode === 'agenda' && (
        <>
          <div className="agenda-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h4 className="agenda-subtitle">CENTRAL CIRÚRGICA</h4>
              <h1 className="agenda-title">Agenda de Cirurgias</h1>
              <div className="agenda-stats">{totalCount} cirurgias - {Object.keys(groupedSurgeries).length} dias</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setViewMode('full')}>
                <List size={18} /> Modo Tabela
              </button>
              {onBack && (
                <button className="btn-secondary" onClick={onBack}>
                  <ArrowLeft size={18} /> Voltar
                </button>
              )}
              {onOpenTV && (
                <button className="btn-secondary" style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid #0f172a' }} onClick={onOpenTV}>
                  <Eye size={18} /> Painel TV
                </button>
              )}
              {canCreate && (
                <button className="btn-primary" style={{ background: '#10b981', color: 'white', border: 'none' }} onClick={onCreateClick}>
                  <Plus size={18} /> Agendar Cirurgia
                </button>
              )}
            </div>
          </div>

          <div className="agenda-filters-card">
            <div className="agenda-filter-topbar">
              <div className="agenda-filter-title">
                <div className="agenda-filter-icon"><Filter size={20} /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Filtros e Ações</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Refine a agenda por equipe, período e status</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div className="agenda-input-wrapper">
                  <Search size={16} />
                  <input type="text" className="agenda-search-input" placeholder="Buscar paciente..." value={patientFilter} onChange={(e) => setPatientFilter(e.target.value.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))} />
                </div>
                <div className="agenda-badge-count">{totalCount} registros</div>
              </div>
            </div>

            <div className="agenda-filter-row">
              <div style={{ flex: 1, width: '100%' }}>
                <div className="agenda-filter-section-title">EQUIPE & LOCAL</div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div className="agenda-input-group">
                    <label className="agenda-input-label">MÉDICO</label>
                    <div className="agenda-input-wrapper">
                      <User size={16} />
                      <select className="agenda-select" value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)}>
                        <option value="">Todos</option>
                        {doctorOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="agenda-input-group">
                    <label className="agenda-input-label">HOSPITAL</label>
                    <div className="agenda-input-wrapper">
                      <Building2 size={16} />
                      <select className="agenda-select" value={hospitalFilter} onChange={e => setHospitalFilter(e.target.value)}>
                        <option value="">Todos</option>
                        {hospitalOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="agenda-input-group">
                    <label className="agenda-input-label">CONVÊNIO</label>
                    <div className="agenda-input-wrapper">
                      <CreditCard size={16} />
                      <select className="agenda-select" value={insuranceFilter} onChange={e => setInsuranceFilter(e.target.value)}>
                        <option value="">Todos</option>
                        {insuranceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="agenda-input-group">
                    <label className="agenda-input-label">VENDEDOR</label>
                    <div className="agenda-input-wrapper">
                      <User size={16} />
                      <select className="agenda-select" value={salespersonFilter} onChange={e => setSalespersonFilter(e.target.value)}>
                        <option value="">Todos</option>
                        {salespersonOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="agenda-input-group">
                    <label className="agenda-input-label">INSTRUMENTADOR</label>
                    <div className="agenda-input-wrapper">
                      <Smartphone size={16} />
                      <select className="agenda-select" value={instrumentalist1Filter} onChange={e => setInstrumentalist1Filter(e.target.value)}>
                        <option value="">Todos</option>
                        {instrumentalist1Options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="agenda-filter-row">
              <div style={{ flex: 1, minWidth: '300px' }}>
                <div className="agenda-filter-section-title">CLASSIFICAÇÃO</div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div className="agenda-input-group">
                    <label className="agenda-input-label">TIPO DE CIRURGIA</label>
                    <div className="agenda-input-wrapper">
                      <Activity size={16} />
                      <select className="agenda-select" value={surgeryTypeFilter} onChange={e => setSurgeryTypeFilter(e.target.value)}>
                        <option value="">Todos</option>
                        {surgeryTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="agenda-input-group">
                    <label className="agenda-input-label">STATUS</label>
                    <div className="agenda-input-wrapper">
                      <Check size={16} />
                      <select className="agenda-select" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                        <option value="">Todos</option>
                        {statusList.map((s, idx) => <option key={idx} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="agenda-input-group">
                    <label className="agenda-input-label">CARÁTER</label>
                    <div className="agenda-input-wrapper">
                      <Tag size={16} />
                      <select className="agenda-select" value={caraterFilter} onChange={e => setCaraterFilter(e.target.value)}>
                        <option value="">Todos</option>
                        {caraterOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '300px' }}>
                <div className="agenda-filter-section-title">PERÍODO</div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="agenda-input-group" style={{ opacity: noDateOnly ? 0.5 : 1, pointerEvents: noDateOnly ? 'none' : 'auto' }}>
                    <label className="agenda-input-label">DE</label>
                    <div className="agenda-input-wrapper">
                      <Calendar size={16} />
                      <input type="date" className="agenda-select" value={startDateFilter} onChange={e => setStartDateFilter(e.target.value)} />
                    </div>
                  </div>
                  <div className="agenda-input-group" style={{ opacity: noDateOnly ? 0.5 : 1, pointerEvents: noDateOnly ? 'none' : 'auto' }}>
                    <label className="agenda-input-label">ATÉ</label>
                    <div className="agenda-input-wrapper">
                      <Calendar size={16} />
                      <input type="date" className="agenda-select" value={endDateFilter} onChange={e => setEndDateFilter(e.target.value)} />
                    </div>
                  </div>
                  <div className="agenda-input-group" style={{ display: 'flex', alignItems: 'center', height: '42px', paddingLeft: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                      <input type="checkbox" checked={noDateOnly} onChange={e => setNoDateOnly(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#8b5cf6' }} />
                      SEM DATA DEFINIDA
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="agenda-actions-bar">
              <div className="agenda-actions-left">
                <button className="agenda-btn" onClick={fetchSurgeries} disabled={loading}>
                  <RefreshCw size={16} className={loading ? "spin" : ""} /> Recarregar
                </button>
                <button className="agenda-btn" onClick={() => window.print()}>
                  <Printer size={16} /> Imprimir
                </button>
                <button className="agenda-btn agenda-btn-excel" onClick={handleExportExcel} disabled={isExporting}>
                  <FileSpreadsheet size={16} /> Excel
                </button>
                <button className="agenda-btn agenda-btn-pdf" onClick={handleExportPDF} disabled={isExporting}>
                  <FileText size={16} /> PDF
                </button>
                <button className="agenda-btn" onClick={() => {}}>
                  <FileText size={16} /> Modelo
                </button>
                <button className="agenda-btn" onClick={() => setIsImporting(true)}>
                  <Download size={16} /> Importar
                </button>
              </div>
              <button className="agenda-btn agenda-btn-whatsapp" onClick={() => {}}>
                <MessageCircle size={16} /> Compartilhar via WhatsApp
              </button>
            </div>
          </div>

          <div className="agenda-surgeries-container">
            {Object.keys(groupedSurgeries).length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Nenhuma cirurgia encontrada com os filtros atuais.</div>
            )}
            
            {Object.entries(groupedSurgeries).map(([dateStr, daySurgeries]) => {
              const dayName = getDayOfWeek(dateStr);
              const dateFormatted = formatDateShort(dateStr);
              return (
                <div key={dateStr}>
                  <div className="agenda-date-divider">
                    <h3 className="agenda-date-title">
                      {dayName} <span className="agenda-date-subtitle">{dateFormatted}</span>
                      <span className="agenda-date-badge">{daySurgeries.length}</span>
                    </h3>
                  </div>
                  
                  <div className="agenda-card-grid">
                    {daySurgeries.map(surgery => {
                      const isPending = surgery.status === 'PENDENTE';
                      const isScheduled = surgery.status === 'AGENDADA';
                      const isConfirmed = surgery.status === 'CONFIRMADA';
                      const isCanceled = surgery.status === 'CANCELADA';
                      
                      let statusClass = '';
                      if (isPending) statusClass = 'agenda-status-pendente';
                      else if (isScheduled) statusClass = 'agenda-status-agendada';
                      else if (isConfirmed) statusClass = 'agenda-status-confirmada';
                      else if (isCanceled) statusClass = 'agenda-status-cancelada';
                      
                      return (
                        <div key={surgery.id} className="agenda-card" onClick={() => onViewClick && onViewClick(surgery)} style={{ cursor: 'pointer' }}>
                          <div className="agenda-card-header">
                            <span className={`agenda-status-badge ${statusClass}`}>{surgery.status}</span>
                            <span className="agenda-time">{surgery.time || '--:--'}</span>
                          </div>
                          
                          <div className="agenda-patient-name">{surgery.patient}</div>
                          
                          <div className="agenda-info-grid">
                            <div className="agenda-info-item"><Building2 size={14}/> {surgery.hospital || '-'}</div>
                            <div className="agenda-info-item"><CreditCard size={14}/> {surgery.insurance || '-'}</div>
                            <div className="agenda-info-item"><User size={14}/> {surgery.doctor || '-'}</div>
                            <div className="agenda-info-item"><Activity size={14}/> 
                              <span style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {surgery.surgery_type || 'Geral'} 
                                {surgery.carater && (
                                  <span className={surgery.carater === 'URGÊNCIA' || surgery.carater === 'URGENCIA' ? 'agenda-carater-urgencia' : 'agenda-carater-eletiva'}>
                                    - {surgery.carater}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                          
                          <div className="agenda-card-footer">
                            <span className={`agenda-pill ${surgery.opme_checked ? 'active' : 'inactive'}`}>OPME</span>
                            <span className={`agenda-pill ${surgery.cme_checked ? 'active' : 'inactive'}`}>CME</span>
                            <span className={`agenda-pill ${surgery.bloco_checked ? 'active' : 'inactive'}`}>BLOCO</span>
                            <span className={`agenda-pill ${surgery.pos_checked ? 'active' : 'inactive'}`}>Pós</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', padding: '8px 16px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                style={{ padding: '6px', borderRadius: '50%', border: 'none', background: currentPage === 1 ? 'transparent' : '#f1f5f9', color: currentPage === 1 ? '#cbd5e1' : '#475569', cursor: currentPage === 1 ? 'default' : 'pointer' }}
              >
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                Página {currentPage} de {Math.ceil(totalCount / pageSize) || 1}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / pageSize) || 1, p + 1))} 
                disabled={currentPage >= Math.ceil(totalCount / pageSize) || totalCount === 0}
                style={{ padding: '6px', borderRadius: '50%', border: 'none', background: currentPage >= Math.ceil(totalCount / pageSize) || totalCount === 0 ? 'transparent' : '#f1f5f9', color: currentPage >= Math.ceil(totalCount / pageSize) || totalCount === 0 ? '#cbd5e1' : '#475569', cursor: currentPage >= Math.ceil(totalCount / pageSize) || totalCount === 0 ? 'default' : 'pointer' }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      {viewMode === 'full' && (
        <div className="table-mode-container">
          <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <h1 className="dashboard-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Mapa Cirúrgico</h1>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {onBack && (
            <button className="btn-secondary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontWeight: 600, border: '1px solid var(--border-glass)', transition: 'all 0.2s' }} onClick={onBack}>
              <ArrowLeft size={18} />
              Voltar
            </button>
          )}
          <button 
            className="btn-secondary" 
            title="Alternar Visualização"
            onClick={() => setViewMode('agenda')}
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontWeight: 600, border: '1px solid var(--border-glass)', transition: 'all 0.2s', background: 'var(--bg-primary, #ffffff)', color: 'var(--text-primary)' }}
          >
            <LayoutGrid size={18} />
            Modo Agenda
          </button>
          {onOpenTV && (
            <button className="btn-secondary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontWeight: 600, background: '#0f172a', color: '#f8fafc', border: '1px solid #0f172a', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', transition: 'all 0.2s' }} onClick={onOpenTV} title="Abrir Modo TV">
              <Eye size={18} />
              Painel TV
            </button>
          )}
          {canCreate && (
            <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontWeight: 600, background: 'var(--primary-color, #10b981)', color: '#ffffff', border: 'none', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s' }} onClick={onCreateClick}>
              <Plus size={18} />
              Agendar Cirurgia
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE FILTROS E AÇÕES */}
      <div className="filters-bar glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: showFilters ? '20px' : '0', padding: showFilters ? '24px' : '16px 24px', borderRadius: '16px', background: 'var(--bg-secondary, #ffffff)', border: '1px solid var(--border-glass)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', transition: 'all 0.3s ease-in-out' }}>
        
        {/* HEADER DOS FILTROS */}
        <div 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setShowFilters(!showFilters)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={20} style={{ color: '#0d9488' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Filtros e Ações</h2>
            <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', marginLeft: '4px', transition: 'transform 0.3s', transform: showFilters ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              <ChevronRight size={18} />
            </div>
          </div>
          <div style={{ background: 'var(--bg-primary, #f8fafc)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', border: '1px solid var(--border-glass)' }}>
            {totalCount} registros
          </div>
        </div>

        <div style={{ display: showFilters ? 'flex' : 'none', flexDirection: 'column', gap: '20px', marginTop: showFilters ? '10px' : '0' }}>

        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0d9488', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
          🔍 BUSCAR POR
        </div>

        {/* LINHA 1: FILTROS */}
        <div className="filters-grid">
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px', height: '42px', borderRadius: '8px', border: '1px solid var(--border-glass)', width: '100%' }}
              placeholder="Paciente"
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Stethoscope size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            <select
              className="form-input"
              style={{ paddingLeft: '36px', height: '42px', borderRadius: '8px', border: '1px solid var(--border-glass)', width: '100%', appearance: 'none' }}
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
            >
              <option value="">Médico (Todos)</option>
              {doctorOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div style={{ position: 'relative' }}>
            <Building2 size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            <select
              className="form-input"
              style={{ paddingLeft: '36px', height: '42px', borderRadius: '8px', border: '1px solid var(--border-glass)', width: '100%', appearance: 'none' }}
              value={hospitalFilter}
              onChange={(e) => setHospitalFilter(e.target.value)}
            >
              <option value="">Hospital (Todos)</option>
              {hospitalOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div style={{ position: 'relative' }}>
            <CreditCard size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: insuranceFilter ? '#0d9488' : '#94a3b8' }} />
            <select
              className="form-input"
              style={{ paddingLeft: '36px', height: '42px', borderRadius: '8px', border: insuranceFilter ? '1px solid #0d9488' : '1px solid var(--border-glass)', background: insuranceFilter ? '#f0fdf4' : 'transparent', color: insuranceFilter ? '#065f46' : 'inherit', width: '100%', appearance: 'none' }}
              value={insuranceFilter}
              onChange={(e) => setInsuranceFilter(e.target.value)}
            >
              <option value="">Convênio (Todos)</option>
              {insuranceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            <select
              className="form-input"
              style={{ paddingLeft: '36px', height: '42px', borderRadius: '8px', border: '1px solid var(--border-glass)', width: '100%', appearance: 'none' }}
              value={salespersonFilter}
              onChange={(e) => setSalespersonFilter(e.target.value)}
            >
              <option value="">Vendedor (Todos)</option>
              {salespersonOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div style={{ position: 'relative' }}>
            <Activity size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            <select
              className="form-input"
              style={{ paddingLeft: '36px', height: '42px', borderRadius: '8px', border: '1px solid var(--border-glass)', width: '100%', appearance: 'none' }}
              value={surgeryTypeFilter}
              onChange={(e) => setSurgeryTypeFilter(e.target.value)}
            >
              <option value="">Tipo de cirurgia (Todos)</option>
              {surgeryTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div style={{ position: 'relative' }}>
            <Smartphone size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            <select
              className="form-input"
              style={{ paddingLeft: '36px', height: '42px', borderRadius: '8px', border: '1px solid var(--border-glass)', width: '100%', appearance: 'none' }}
              value={instrumentalist1Filter}
              onChange={(e) => setInstrumentalist1Filter(e.target.value)}
            >
              <option value="">Instrumentador (Todos)</option>
              {instrumentalist1Options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div style={{ position: 'relative' }}>
            <Check size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            <select 
              className="form-input" 
              style={{ paddingLeft: '36px', height: '42px', borderRadius: '8px', border: '1px solid var(--border-glass)', width: '100%', appearance: 'none' }}
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              {statusList.map((s, idx) => (
                <option key={idx} value={s.name}>{s.icon} {s.name}</option>
              ))}
            </select>
          </div>

          <div className="date-filter-container" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', opacity: noDateOnly ? 0 : 1, visibility: noDateOnly ? 'hidden' : 'visible', transition: 'all 0.2s ease-in-out', gridColumn: '1 / -1' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '130px' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
              <input 
                type="date" 
                className="form-input" 
                style={{ paddingLeft: '68px', height: '42px', borderRadius: '8px', border: '1px solid var(--border-glass)', width: '100%' }}
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                disabled={noDateOnly}
                title="Data Inicial"
              />
              <span style={{ position: 'absolute', left: '36px', top: '11px', fontSize: '0.9rem', color: '#64748b', pointerEvents: 'none' }}>De:</span>
            </div>
            <div style={{ position: 'relative', flex: 1, minWidth: '130px' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
              <input 
                type="date" 
                className="form-input" 
                style={{ paddingLeft: '72px', height: '42px', borderRadius: '8px', border: '1px solid var(--border-glass)', width: '100%' }}
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                disabled={noDateOnly}
                title="Data Final"
              />
              <span style={{ position: 'absolute', left: '36px', top: '11px', fontSize: '0.9rem', color: '#64748b', pointerEvents: 'none' }}>Até:</span>
            </div>
            <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
              <Tag size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: caraterFilter ? '#0d9488' : '#94a3b8' }} />
              <select
                className="form-input"
                style={{ 
                  paddingLeft: '36px', 
                  height: '42px', 
                  borderRadius: '8px', 
                  border: caraterFilter ? '1px solid #0d9488' : '1px solid var(--border-glass)', 
                  background: caraterFilter ? '#f0fdf4' : 'transparent', 
                  color: caraterFilter ? '#065f46' : 'inherit', 
                  width: '100%', 
                  appearance: 'none' 
                }}
                value={caraterFilter}
                onChange={(e) => setCaraterFilter(e.target.value)}
              >
                <option value="">Caráter (Todos)</option>
                {caraterOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="date-filter-container" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, fontSize: '0.9rem', cursor: 'pointer', height: '42px', padding: '0 16px', background: 'var(--bg-primary, #f8fafc)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
              <input 
                type="checkbox" 
                checked={noDateOnly}
                onChange={(e) => setNoDateOnly(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#0d9488' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Sem data definida</span>
            </label>

          </div>
        </div>

        {/* LINHA 2: AÇÕES / EXPORTAÇÃO */}
        <div className="actions-grid" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px', marginTop: '4px' }}>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              title="Recarregar dados"
              onClick={fetchSurgeries}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--bg-primary, #ffffff)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
              <span style={{ fontWeight: 500 }}>Recarregar</span>
            </button>

            <button 
              title="Imprimir"
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--bg-primary, #ffffff)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <Printer size={18} />
              <span style={{ fontWeight: 500 }}>Imprimir</span>
            </button>

            <button 
              title="Exportar para Excel"
              onClick={handleExportExcel}
              disabled={isExporting}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', cursor: isExporting ? 'wait' : 'pointer' }}
            >
              <Download className={isExporting ? 'animate-bounce' : ''} size={18} />
              <span style={{ fontWeight: 500 }}>Excel</span>
            </button>
            
            <button 
              title="Exportar para PDF"
              onClick={handleExportPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', cursor: 'pointer' }}
            >
              <FileText size={18} />
              <span style={{ fontWeight: 500 }}>PDF</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {canImport && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileUpload} 
                />
                <button 
                  title="Baixar Modelo de Importação"
                  onClick={handleDownloadTemplate}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--bg-primary, #ffffff)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <Upload size={18} />
                  <span style={{ fontWeight: 500 }}>Modelo XLSX</span>
                </button>
                
                <button 
                  title="Importar Planilha"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#0f766e', border: 'none', borderRadius: '8px', color: '#ffffff', cursor: isImporting ? 'wait' : 'pointer' }}
                >
                  {isImporting ? <Clock className="animate-spin" size={18} /> : <FileText size={18} />}
                  <span style={{ fontWeight: 500 }}>{isImporting ? 'Importando...' : 'Importar planilha'}</span>
                </button>
              </>
            )}

            <button 
              title="Compartilhar no WhatsApp"
              onClick={handleShareWhatsApp}
              disabled={isExporting}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#16a34a', border: 'none', borderRadius: '8px', color: '#ffffff', opacity: isExporting ? 0.7 : 1, cursor: isExporting ? 'not-allowed' : 'pointer' }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              <span style={{ fontWeight: 500 }}>{isExporting ? 'Preparando...' : 'Compartilhar via WhatsApp'}</span>
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* BARRA DE ROLAGEM SUPERIOR */}
      {surgeries.length > 0 && !loading && (
        <div 
          ref={topScrollRef}
          style={{ overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: '4px' }}
          onScroll={handleTopScroll}
          className="top-scrollbar custom-scrollbar"
        >
          <div style={{ height: '1px' }}></div>
        </div>
      )}

      {/* TABELA DE DADOS */}
      <div 
        ref={tableContainerRef} 
        className={viewMode === 'full' ? "table-container" : "compact-table-container"} 
        id="printable-table-container"
        onScroll={handleBottomScroll}
      >
        {loading && surgeries.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
            <Clock className="animate-spin" size={32} style={{ color: '#3b82f6', marginRight: '10px' }} />
            <span>Carregando dados da tabela...</span>
          </div>
        ) : surgeries.length > 0 || loading ? (
          <>
            {/* CONTROLADOR DE PAGINAÇÃO SUPERIOR */}
            <div className="pagination" style={{ borderTop: 'none', borderBottom: '1px solid var(--border-glass)', padding: '6px 16px', background: 'var(--bg-secondary, #fafafa)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
              <span className="pagination-info">
                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({totalCount} cirurgias no total)
              </span>
              <div className="pagination-controls">
                <button 
                  className="btn-icon" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  className="btn-icon" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {viewMode === 'full' && (
              <table className="data-table" style={{ zoom: tableZoom }}>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Data/Hora</th>
                    <th>Paciente</th>
                    <th>Hospital</th>
                    <th>Médico</th>
                    <th>Convênio</th>
                    <th>Tipo de Cirurgia</th>
                    <th>Caráter</th>
                    <th>Material / Procedimento</th>
                    <th>Cód. Cirurgia</th>
                    <th style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>OPME</th>
                    <th style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>CME</th>
                    <th style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>BLOCO</th>
                    <th style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>PÓS</th>
                    <th style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>ANEXO 1</th>
<th style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>ANEXO 2</th>
                    <th>Observação</th>
                    <th>Instrumentador 1</th>
                    <th>Instrumentador 2</th>
                    <th>Vendedor</th>

                  </tr>
                </thead>
                <tbody>
                  {surgeries.map((surgery) => (
                    <tr 
                      key={surgery.id} 
                      className="surgery-row"
                      onClick={() => onViewClick && onViewClick(surgery)}
                      style={{ cursor: 'pointer' }}
                      title="Clique para ver os detalhes"
                    >
                      <td>
                        <span className={`status-badge ${getStatusClass(surgery.status)}`}>
                          {surgery.delivery_status || getLegacyIcon(surgery.status)} {surgery.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{formatBrazilianDate(surgery.date)}</div>
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{surgery.time || '--:--'}</div>
                      </td>
                      <td><div style={{ fontWeight: '500', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={surgery.patient}>{surgery.patient}</div></td>
                      <td><div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={surgery.hospital}>{surgery.hospital}</div></td>
                      <td><div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={surgery.doctor}>{surgery.doctor}</div></td>
                      <td><div style={{ fontSize: '0.85rem' }}>{surgery.insurance}</div></td>
                      <td><div style={{ fontSize: '0.85rem' }}>{surgery.surgery_type || '-'}</div></td>
                      <td><div style={{ fontSize: '0.85rem', fontWeight: '500', color: (surgery.carater === 'URGÊNCIA' || surgery.carater === 'URGENCIA') ? '#f87171' : (surgery.carater === 'JUDICIAL' ? '#c084fc' : '#64748b') }}>{surgery.carater || '-'}</div></td>
                      <td>
                        <div 
                          style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }} 
                          title={surgery.material_procedure}
                        >
                          {surgery.material_procedure}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: '#9ca3af', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={surgery.surgery_code}>{surgery.surgery_code || '-'}</div>
                      </td>
                      {/* Checklist OPME */}
                      <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                        <button 
                          className={`checkbox-pill ${surgery.opme_checked ? 'active' : 'inactive'}`}
                          disabled={!isFieldEditable('opme')}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCheck(surgery.id, 'opme_checked', surgery.opme_checked);
                          }}
                        >
                          {surgery.opme_checked ? <Check size={12} /> : <X size={12} />}
                          OPME
                        </button>
                      </td>
                      {/* Checklist CME */}
                      <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                        <button 
                          className={`checkbox-pill ${surgery.cme_checked ? 'active' : 'inactive'}`}
                          disabled={!isFieldEditable('cme')}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCheck(surgery.id, 'cme_checked', surgery.cme_checked);
                          }}
                        >
                          {surgery.cme_checked ? <Check size={12} /> : <X size={12} />}
                          CME
                        </button>
                      </td>
                      {/* Checklist BLOCO */}
                      <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                        <button 
                          className={`checkbox-pill ${surgery.bloco_checked ? 'active' : 'inactive'}`}
                          disabled={!isFieldEditable('bloco')}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCheck(surgery.id, 'bloco_checked', surgery.bloco_checked);
                          }}
                        >
                          {surgery.bloco_checked ? <Check size={12} /> : <X size={12} />}
                          BLOCO
                        </button>
                      </td>
                      {/* Checklist Pós */}
                      <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                        <button 
                          className={`checkbox-pill ${surgery.pos_checked ? 'active' : 'inactive'}`}
                          disabled={!isFieldEditable('pos')}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCheck(surgery.id, 'pos_checked', surgery.pos_checked);
                          }}
                        >
                          {surgery.pos_checked ? <Check size={12} /> : <X size={12} />}
                          PÓS
                        </button>
                      </td>
                      {/* Anexo 1 Indicador */}
                      <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                        {(() => {
                          const hasAtt1 = ((surgery.medical_request_urls && surgery.medical_request_urls.length > 0) || !!surgery.attachment_url);
                          return (
                            <button 
                              className={`checkbox-pill ${hasAtt1 ? 'active' : 'inactive'}`}
                              disabled={true}
                              style={{ cursor: 'default' }}
                            >
                              {hasAtt1 ? <Check size={12} /> : <X size={12} />}
                              ANEXO 1
                            </button>
                          );
                        })()}
                      </td>
                      {/* Anexo 2 Indicador */}
                      <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                        {(() => {
                          const hasAtt2 = (surgery.comanda_urls && surgery.comanda_urls.length > 0);
                          return (
                            <button 
                              className={`checkbox-pill ${hasAtt2 ? 'active' : 'inactive'}`}
                              disabled={true}
                              style={{ cursor: 'default' }}
                            >
                              {hasAtt2 ? <Check size={12} /> : <X size={12} />}
                              ANEXO 2
                            </button>
                          );
                        })()}
                      </td>
                      <td>
                        <div 
                          style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', color: '#9ca3af' }} 
                          title={surgery.observation}
                        >
                          {surgery.observation || '-'}
                        </div>
                      </td>
                      <td>
                        <div 
                          style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }} 
                          title={surgery.instrumentalist1}
                        >
                          {surgery.instrumentalist1 || '-'}
                        </div>
                      </td>
                      <td>
                        <div 
                          style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }} 
                          title={surgery.instrumentalist2}
                        >
                          {surgery.instrumentalist2 || '-'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{surgery.salesperson || '-'}</span>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {viewMode === 'compact' && (
              <div className="compact-fullscreen-overlay">
                <div className="compact-fullscreen-header">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', margin: 0 }}>
                    <List size={22} /> Mapa em Modo Planilha
                    <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 'normal', marginLeft: '10px' }}>
                      {(() => {
                        let textParts = [];
                        if (startDateFilter && endDateFilter) {
                          textParts.push(`De: ${formatBrazilianDate(startDateFilter)}`);
                          textParts.push(`Até: ${formatBrazilianDate(endDateFilter)}`);
                        } else if (startDateFilter) {
                          textParts.push(`De: ${formatBrazilianDate(startDateFilter)} - todas agendadas pra frente`);
                        } else if (endDateFilter) {
                          textParts.push(`Até: ${formatBrazilianDate(endDateFilter)}`);
                        }
                        return textParts.length > 0 ? `| Período: ${textParts.join(' - ')}` : '';
                      })()}
                    </span>
                  </h2>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {Object.values(columnFilters).some(v => v && v.trim() !== '') && (
                      <button 
                        className="btn-secondary" 
                        onClick={() => setColumnFilters({})}
                        style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center', color: '#ef4444', borderColor: '#ef4444' }}
                        title="Limpar todos os filtros das colunas"
                      >
                        <X size={18} /> Limpar Filtros
                      </button>
                    )}
                    <button 
                      className="btn-secondary" 
                      onClick={() => setViewMode('full')}
                      style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}
                    >
                      <X size={18} /> Fechar Tela Cheia
                    </button>
                  </div>
                </div>
                
                <div className="compact-table-container" style={{ flex: 1, margin: 0, border: 'none', borderRadius: '8px', overflow: 'auto' }}>
                  <table className="compact-table">
                    <thead>
                      <tr>
                        {renderFilterableHeader('Status', 'status')}
                        {renderFilterableHeader('Data/Hora', 'date')}
                        {renderFilterableHeader('Paciente', 'patient')}
                        {renderFilterableHeader('Hospital', 'hospital')}
                        {renderFilterableHeader('Médico', 'doctor')}
                        {renderFilterableHeader('Convênio', 'insurance')}
                        {renderFilterableHeader('Tipo de Cirurgia', 'surgery_type')}
                    {renderFilterableHeader('Caráter', 'carater')}
                        {renderFilterableHeader('Material / Procedimento', 'material_procedure')}
                        {renderFilterableHeader('Cód. Cirurgia', 'surgery_code')}
                        <th style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>OPME</th>
                        <th style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>CME</th>
                        <th style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>BLOCO</th>
                        <th style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>PÓS</th>
                        <th style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>ANEXO 1</th>
<th style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>ANEXO 2</th>
                        {renderFilterableHeader('Observação', 'observation')}
                        {renderFilterableHeader('Instrumentador 1', 'instrumentalist1')}
                        {renderFilterableHeader('Instrumentador 2', 'instrumentalist2')}
                        {renderFilterableHeader('Vendedor', 'salesperson')}
                        <th style={{ textAlign: 'center', width: '40px' }}><Info size={14} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {surgeries.map((surgery) => (
                        <tr 
                          key={surgery.id}
                          onClick={() => onViewClick && onViewClick(surgery)}
                        >
                          <td>{surgery.delivery_status || getLegacyIcon(surgery.status)} {surgery.status}</td>
                          <td>{formatBrazilianDate(surgery.date)} {surgery.time ? `- ${surgery.time}` : ''}</td>
                          <td>{surgery.patient}</td>
                          <td>{surgery.hospital || '-'}</td>
                          <td>{surgery.doctor || '-'}</td>
                          <td>{surgery.insurance || '-'}</td>
                          <td>{surgery.surgery_type || '-'}</td>
                          <td><div style={{ padding: '0 8px', fontSize: '0.8rem', whiteSpace: 'nowrap', fontWeight: '500', color: (surgery.carater === 'URGÊNCIA' || surgery.carater === 'URGENCIA') ? '#f87171' : (surgery.carater === 'JUDICIAL' ? '#c084fc' : '#64748b') }}>{surgery.carater || '-'}</div></td>
                          <td>{surgery.material_procedure || '-'}</td>
                          <td>{surgery.surgery_code || '-'}</td>
                          
                          <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                            <span style={{ color: surgery.opme_checked ? '#34d399' : 'var(--text-muted)' }}>
                              {surgery.opme_checked ? '✓' : '—'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                            <span style={{ color: surgery.cme_checked ? '#34d399' : 'var(--text-muted)' }}>
                              {surgery.cme_checked ? '✓' : '—'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                            <span style={{ color: surgery.bloco_checked ? '#34d399' : 'var(--text-muted)' }}>
                              {surgery.bloco_checked ? '✓' : '—'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                            <span style={{ color: surgery.pos_checked ? '#34d399' : 'var(--text-muted)' }}>
                              {surgery.pos_checked ? '✓' : '—'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                            {(() => {
                              const hasAtt1 = (surgery.medical_request_urls && surgery.medical_request_urls.length > 0) || !!surgery.attachment_url;
                              return (
                                <span style={{ color: hasAtt1 ? '#34d399' : 'var(--text-muted)' }}>
                                  {hasAtt1 ? '✓' : '—'}
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                            {(() => {
                              const hasAtt2 = (surgery.comanda_urls && surgery.comanda_urls.length > 0);
                              return (
                                <span style={{ color: hasAtt2 ? '#34d399' : 'var(--text-muted)' }}>
                                  {hasAtt2 ? '✓' : '—'}
                                </span>
                              );
                            })()}
                          </td>
                          
                          <td>{surgery.observation || '-'}</td>
                          <td>{surgery.instrumentalist1 || '-'}</td>
                          <td>{surgery.instrumentalist2 || '-'}</td>
                          <td>{surgery.salesperson || '-'}</td>
                          
                          <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                            <button 
                              className="info-icon-btn"
                              title="Detalhes"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewClick && onViewClick(surgery);
                              }}
                            >
                              <Info size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pagination" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: '16px' }}>
                  <span className="pagination-info">
                    Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({totalCount} cirurgias no total)
                  </span>
                  <div className="pagination-controls">
                    <button 
                      className="btn-icon" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button 
                      className="btn-icon" 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'cards' && (
              <div className="surgery-card-grid" style={{ padding: '20px' }}>
                {surgeries.map((surgery) => (
                  <div 
                    key={surgery.id} 
                    className="surgery-card" 
                    onClick={() => onViewClick && onViewClick(surgery)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="surgery-card-header">
                      <span className="status-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {surgery.delivery_status || getLegacyIcon(surgery.status)} {surgery.status}
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem', fontWeight: 500 }}>
                        <span>{formatBrazilianDate(surgery.date)}</span>
                        {surgery.time && <span style={{ color: 'var(--text-secondary)' }}>{surgery.time}</span>}
                      </div>
                    </div>
                    
                    <div className="surgery-card-body">
                      <div className="card-patient-name">{surgery.patient}</div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                        <div className="card-info-row">
                          <span title="Hospital">🏥 {surgery.hospital || '-'}</span>
                        </div>
                        <div className="card-info-row">
                          <span title="Médico">👨‍⚕️ {surgery.doctor || '-'}</span>
                        </div>
                        <div className="card-info-row">
                          <span title="Convênio">🏢 {surgery.insurance || '-'}</span>
                        </div>
                        <div className="card-info-row">
                          <span title="Caráter" style={{ color: (surgery.carater === 'URGÊNCIA' || surgery.carater === 'URGENCIA') ? '#f87171' : 'inherit', fontWeight: 500 }}>
                            ⚡ {surgery.carater || '-'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="card-info-row" style={{ marginTop: '8px' }}>
                        <span title="Tipo de Cirurgia">🔪 {surgery.surgery_type || '-'}</span>
                      </div>
                      
                      <div className="card-info-row">
                        <span title="Procedimento">📋 {surgery.material_procedure || '-'}</span>
                      </div>
                      
                      <div className="card-info-row">
                        <span title="Cód. Cirurgia">🏷️ Cód: {surgery.surgery_code || '-'}</span>
                      </div>
                    </div>
                    
                    <div className="surgery-card-footer">
                       <span className={`checkbox-pill ${surgery.opme_checked ? 'active' : 'inactive'}`}>OPME</span>
                       <span className={`checkbox-pill ${surgery.cme_checked ? 'active' : 'inactive'}`}>CME</span>
                       <span className={`checkbox-pill ${surgery.bloco_checked ? 'active' : 'inactive'}`}>BLOCO</span>
                       <span className={`checkbox-pill ${surgery.pos_checked ? 'active' : 'inactive'}`}>PÓS</span>
                       
                       {((surgery.medical_request_urls && surgery.medical_request_urls.length > 0) || !!surgery.attachment_url) && (
                         <span className="checkbox-pill active">ANEXO 1</span>
                       )}
                       {(surgery.comanda_urls && surgery.comanda_urls.length > 0) && (
                         <span className="checkbox-pill active">ANEXO 2</span>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CONTROLADOR DE PAGINAÇÃO */}
            <div className="pagination" style={{ borderTop: '1px solid var(--border-glass)', padding: '6px 16px', background: 'var(--bg-secondary, #fafafa)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
              <span className="pagination-info">
                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({totalCount} cirurgias no total)
              </span>
              <div className="pagination-controls">
                <button 
                  className="btn-icon" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  className="btn-icon" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <h3>Nenhuma cirurgia encontrada</h3>
            <p style={{ marginTop: '10px' }}>Tente alterar os termos da sua pesquisa ou os filtros selecionados.</p>
          </div>
        )}
      </div>

      {/* OFF-SCREEN CONTAINER FOR PDF & PRINT */}
      {printData && (
        <div id="print-container-wrapper" className="print-wrapper">
          <div id="print-container" style={{ width: '100%', backgroundColor: 'white', padding: '10px' }}>
            <h2 style={{ textAlign: 'center', color: 'black', marginBottom: '10px', fontSize: '16px' }}>Mapa Cirúrgico - {getReportTitle()}</h2>
            <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', color: 'black' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Data/Hora</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Status</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Médico</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Hospital</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Paciente</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Convênio</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Tipo Cirurgia</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Mat/Proc</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Cód</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>OPME</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>CME</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>BLOCO</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>PÓS</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>ANEXO 1</th>
<th style={{ border: '1px solid #ccc', padding: '4px' }}>ANEXO 2</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Obs.</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Instr. 1</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Instr. 2</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Vendedor</th>
                </tr>
              </thead>
              <tbody>
                {printData.map(item => (
                  <tr key={item.id}>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{formatBrazilianDate(item.date)}<br/>{item.time || ''}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.status}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.doctor}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.hospital}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.patient}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.insurance}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.surgery_type}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.material_procedure}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.surgery_code}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.opme_checked ? '✓' : ''}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.cme_checked ? '✓' : ''}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.bloco_checked ? '✓' : ''}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.pos_checked ? '✓' : ''}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>{((item.medical_request_urls && item.medical_request_urls.length > 0) || item.attachment_url) ? '✓' : ''}</td>
<td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>{(item.comanda_urls && item.comanda_urls.length > 0) ? '✓' : ''}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.observation || ''}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.instrumentalist1}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.instrumentalist2}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.salesperson}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Escolha para Compartilhar no WhatsApp */}
      {shareModalData && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary, #ffffff)',
            color: 'var(--text-primary, #0f172a)',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={22} /> Compartilhar no WhatsApp
              </h3>
              <button 
                onClick={() => setShareModalData(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: '1.4' }}>
              <strong>{shareModalData.patient}</strong> possui <strong>{shareModalData.files.length} anexo(s)</strong>. Selecione a opção desejada:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  const encodedText = encodeURIComponent(shareModalData.text);
                  window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                <MessageCircle size={24} style={{ flexShrink: 0 }} />
                <div style={{ textAlign: 'left' }}>
                  <div>1º Enviar Texto das Cirurgias</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 'normal' }}>Envia a mensagem limpa no WhatsApp</div>
                </div>
              </button>

              {shareModalData.files.filter(f => f.type.startsWith('image/')).length > 0 && (
                <button
                  onClick={async () => {
                    const imgFiles = shareModalData.files.filter(f => f.type.startsWith('image/')).map(f => new File([f], f.name, { type: f.type }));
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: imgFiles })) {
                      try {
                        await navigator.share({
                          files: imgFiles,
                          title: `Imagens - ${shareModalData.patient}`,
                          text: `Anexos: ${imgFiles.map(f => f.name).join(', ')}`
                        });
                        return;
                      } catch (e) {
                        if (e.name === 'AbortError') return;
                      }
                    }
                    imgFiles.forEach(file => {
                      const blobUrl = URL.createObjectURL(file);
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = file.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(blobUrl);
                    });
                    alert(`${imgFiles.length} imagem(ns) baixada(s). Anexe-as no WhatsApp.`);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  <Paperclip size={24} style={{ flexShrink: 0 }} />
                  <div style={{ textAlign: 'left' }}>
                    <div>2º Enviar Imagens ({shareModalData.files.filter(f => f.type.startsWith('image/')).length})</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 'normal' }}>Enviar todas imagens anexo1 e anexo2</div>
                  </div>
                </button>
              )}

              {shareModalData.files.filter(f => f.type === 'application/pdf').length > 0 && (
                <button
                  onClick={async () => {
                    const pdfFiles = shareModalData.files.filter(f => f.type === 'application/pdf').map(f => new File([f], f.name, { type: f.type }));
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: pdfFiles })) {
                      try {
                        await navigator.share({
                          files: pdfFiles,
                          title: `PDFs - ${shareModalData.patient}`,
                          text: `Anexos: ${pdfFiles.map(f => f.name).join(', ')}`
                        });
                        return;
                      } catch (e) {
                        if (e.name === 'AbortError') return;
                      }
                    }
                    pdfFiles.forEach(file => {
                      const blobUrl = URL.createObjectURL(file);
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = file.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(blobUrl);
                    });
                    alert(`${pdfFiles.length} PDF(s) baixado(s). Anexe-os no WhatsApp.`);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  <FileText size={24} style={{ flexShrink: 0 }} />
                  <div style={{ textAlign: 'left' }}>
                    <div>3º Enviar PDFs ({shareModalData.files.filter(f => f.type === 'application/pdf').length})</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 'normal' }}>Enviar todos os PDF anexo1 e anexo2</div>
                  </div>
                </button>
              )}

              <button
                onClick={async () => {
                  const filteredFiles = shareModalData.files.filter(f => f.origin !== 'anexo3');
                  
                  if (navigator.share) {
                    try {
                      try { await navigator.clipboard.writeText(shareModalData.text); } catch(err) { console.error(err); }
                      
                      await navigator.share({
                        files: filteredFiles,
                        title: `Mapa - ${shareModalData.patient}`
                      });
                      return;
                    } catch (e) {
                      if (e.name === 'AbortError') return;
                    }
                  }
                  
                  const encodedText = encodeURIComponent(shareModalData.text);
                  window.open(`https://web.whatsapp.com/send?text=${encodedText}`, '_blank');
                  
                  filteredFiles.forEach(file => {
                    const blobUrl = URL.createObjectURL(file);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = file.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                  });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-secondary, #f1f5f9)',
                  color: 'var(--text-primary, #334155)',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  borderRadius: '10px',
                  fontWeight: '500',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <Share2 size={20} style={{ flexShrink: 0 }} />
                <div style={{ textAlign: 'left' }}>
                  <div>Enviar Texto + Anexos Juntos</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Tentativa direta simultânea<br/>
                    <span style={{ color: '#ea580c', fontWeight: 'bold' }}>⚠️ Nota: Não funciona no WhatsApp Android (limitação do próprio WhatsApp, use os botões separados acima)</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
