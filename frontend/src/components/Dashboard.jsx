import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, CheckCircle2, AlertTriangle, Clock, ShieldAlert, Award, Settings, FileText, TrendingUp, Activity, History, AlertCircle, PackageSearch, PackageCheck, Map, Eye, Tag, CheckCircle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import OnCallModal from './OnCallModal';
import OnCallHistoryModal from './OnCallHistoryModal';

class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Dashboard Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '30px', background: '#ffffff', borderRadius: '12px', margin: '20px', border: '2px solid #ef4444', color: '#991b1b' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#dc2626' }}>⚠️ Erro no Dashboard</h2>
          <p style={{ color: '#374151' }}>Ocorreu o seguinte erro ao renderizar o Dashboard:</p>
          <pre style={{ background: '#fef2f2', padding: '12px', borderRadius: '6px', fontSize: '0.85rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.toString()}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, marginTop: '10px' }}>
            Recarregar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function DashboardInner({ user, onNavigate, onlineUsers, onOpenOnlineModal }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    suspended: 0,
    urgent: 0,
    pendingAuth: 0,
    inSeparation: 0,
    missingAnexo2: 0,
    topHospitals: [],
    topDoctorsOrtopedia: [],
    topDoctorsBuco: [],
    topVendors: [],
    topInstrumentalists: [],
    topInsurances: [],
    topSurgeryTypes: [],
    topCaraters: [],
    monthlyTrend: []
  });
  const [onCallSchedule, setOnCallSchedule] = useState([]);
  const [isOnCallModalOpen, setIsOnCallModalOpen] = useState(false);
  const [isOnCallHistoryModalOpen, setIsOnCallHistoryModalOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState('current_month');
  const [exportModalState, setExportModalState] = useState({ isOpen: false, surgeryType: '' });
  const [printData, setPrintData] = useState(null);
  const [printTitle, setPrintTitle] = useState('');
  const [isExporting, setIsExporting] = useState(null);

  useEffect(() => {
    fetchStats();
  }, [user, periodFilter]);

  const getStartDate = () => {
    const d = new Date();
    if (periodFilter === 'current_month') d.setDate(1);
    else if (periodFilter === 'last_month') {
      d.setMonth(d.getMonth() - 1);
      d.setDate(1);
    }
    else if (periodFilter === 'month') d.setMonth(d.getMonth() - 1);
    else if (periodFilter === 'quarter') d.setMonth(d.getMonth() - 3);
    else if (periodFilter === 'semester') d.setMonth(d.getMonth() - 6);
    else if (periodFilter === 'current_year') {
      d.setMonth(0);
      d.setDate(1);
    }
    else if (periodFilter === 'last_year') {
      d.setFullYear(d.getFullYear() - 1);
      d.setMonth(0);
      d.setDate(1);
    }
    else return null;
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getEndDate = () => {
    let d = new Date();
    if (periodFilter === 'last_month') {
      d.setDate(0); 
    } else if (periodFilter === 'current_month') {
      d.setMonth(d.getMonth() + 1);
      d.setDate(0); 
    } else if (periodFilter === 'last_year') {
      d.setFullYear(d.getFullYear() - 1);
      d.setMonth(11); 
      d.setDate(31);
    } else if (periodFilter === 'current_year') {
      d.setMonth(11);
      d.setDate(31);
    } else {
      return null;
    }
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleNavigate = (filters, clearDates = false) => {
    if (onNavigate) {
      onNavigate({
        ...filters,
        startDate: clearDates ? '' : (getStartDate() || ''),
        endDate: clearDates ? '' : (getEndDate() || '')
      });
    }
  };

  const getPeriodLabel = () => {
    const labels = {
      'all': 'Todo o Histórico',
      'current_month': 'Mês Atual',
      'last_month': 'Mês Passado',
      'quarter': 'Últimos 3 meses',
      'semester': 'Últimos 6 meses',
      'current_year': 'Ano Atual',
      'last_year': 'Ano Passado',
      'month': 'Últimos 30 dias',
      'year': 'Últimos 365 dias'
    };
    return labels[periodFilter] || 'Período Personalizado';
  };

  const exportData = async (format, type) => {
    setIsExporting(format);
    try {
      let q = supabase.from('surgeries').select('*');
      if (user?.role === 'Instrumentador' || user?.role === 'Vendedor') {
        q = q.or(`instrumentalist1.eq."${user.name}",instrumentalist2.eq."${user.name}",salesperson.eq."${user.name}"`);
      }
      const startDate = getStartDate();
      const endDate = getEndDate();
      if (startDate) q = q.gte('date', startDate);
      if (endDate) q = q.lte('date', endDate);
      if (type) q = q.ilike('surgery_type', type);
      
      q = q.order('date', { ascending: true }).order('time', { ascending: true }).limit(5000);
      
      const { data, error } = await q;
      if (error) throw error;
      
      if (!data || data.length === 0) {
        alert('Nenhum dado encontrado para este filtro.');
        setIsExporting(null);
        return;
      }

      const periodLabel = getPeriodLabel();
      const title = `Relação de Cirurgia por tipo - ${type} - ${periodLabel}`;

      if (format === 'excel') {
        const exportDataRows = data.map(item => ({
          'Status': item.status || '',
          'Data': item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '',
          'Hora': item.time || '',
          'Médico': item.doctor || '',
          'Hospital': item.hospital || '',
          'Paciente': item.patient || '',
          'Convênio': item.insurance || '',
          'Tipo de Cirurgia': item.surgery_type || '',
          'Material/Procedimento': item.material_procedure || '',
          'Cód. Cirurgia': item.surgery_code || '',
          'OPME': item.opme_checked ? 'Sim' : 'Não',
          'CME': item.cme_checked ? 'Sim' : 'Não',
          'BLOCO': item.bloco_checked ? 'Sim' : 'Não',
          'PÓS': item.pos_checked ? 'Sim' : 'Não',
          'ANEXO 1': ((item.medical_request_urls && item.medical_request_urls.length > 0) || item.attachment_url) ? 'Sim' : 'Não',
          'ANEXO 2': (item.comanda_urls && item.comanda_urls.length > 0) ? 'Sim' : 'Não',
          'Instr. 1': item.instrumentalist1 || '',
          'Instr. 2': item.instrumentalist2 || '',
          'Vendedor': item.salesperson || '',
          'Observação': item.observation || ''
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(exportDataRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cirurgias');
        
        const fileName = `${title}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        setIsExporting(null);
        setExportModalState({ isOpen: false, surgeryType: '' });
      } else if (format === 'pdf') {
        setPrintTitle(title);
        setPrintData(data);
        
        setTimeout(() => {
          const element = document.getElementById('dashboard-print-container');
          if (!element) return;
          
          const opt = {
            margin:       5,
            filename:     `${title}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
          };
          
          html2pdf().set(opt).from(element).save().then(() => {
            setPrintData(null);
            setIsExporting(null);
            setExportModalState({ isOpen: false, surgeryType: '' });
          });
        }, 500);
      }
    } catch (err) {
      console.error('Erro ao exportar:', err);
      alert('Ocorreu um erro ao exportar os dados.');
      setIsExporting(null);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate();
      const endDate = getEndDate();

      const buildQuery = (status) => {
        let q = supabase.from('surgeries').select('*', { count: 'exact', head: true });
        
        if (user?.role === 'Instrumentador' || user?.role === 'Vendedor') {
          q = q.or(`instrumentalist1.eq."${user.name}",instrumentalist2.eq."${user.name}",salesperson.eq."${user.name}"`);
        }
        
        if (status) q = q.ilike('status', status);
        if (startDate) q = q.gte('date', startDate);
        if (endDate) q = q.lte('date', endDate);
        return q;
      };

      const buildQueryUnfiltered = (status) => {
        let q = supabase.from('surgeries').select('*', { count: 'exact', head: true });
        
        if (user?.role === 'Instrumentador' || user?.role === 'Vendedor') {
          q = q.or(`instrumentalist1.eq."${user.name}",instrumentalist2.eq."${user.name}",salesperson.eq."${user.name}"`);
        }
        
        if (status) q = q.ilike('status', status);
        return q;
      };

      let qCharts = supabase.from('surgeries').select('*').order('date', { ascending: false }).limit(2000);
      if (startDate) qCharts = qCharts.gte('date', startDate);
      if (endDate) qCharts = qCharts.lte('date', endDate);
      
      if (user?.role === 'Instrumentador' || user?.role === 'Vendedor') {
        qCharts = qCharts.or(`instrumentalist1.eq."${user.name}",instrumentalist2.eq."${user.name}",salesperson.eq."${user.name}"`);
      }

      let qTrend = supabase.from('surgeries').select('date, status').order('date', { ascending: false }).limit(5000);
      const dTrend = new Date();
      const sixMonthsAgo = new Date(dTrend.getFullYear(), dTrend.getMonth() - 5, 1);
      const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;
      qTrend = qTrend.gte('date', sixMonthsAgoStr);
      if (user?.role === 'Instrumentador' || user?.role === 'Vendedor') {
        qTrend = qTrend.or(`instrumentalist1.eq."${user.name}",instrumentalist2.eq."${user.name}",salesperson.eq."${user.name}"`);
      }

      const [
        totalRes,
        deliveredRes,
        suspendedRes,
        pendingRes,
        sepRes,
        eletivaRes,
        sepEntregaRes,
        finalizadaRes,
        materialRetornadoRes,
        missingAnexo2Res,
        chartsRes,
        onCallRes,
        funcionariosRes,
        trendRes
      ] = await Promise.all([
        buildQuery(),
        buildQuery('Material entregue'),
        buildQuery('Suspensa'),
        buildQueryUnfiltered('AUTORIZADAS'),
        buildQuery('EM SEPARACAO'),
        buildQuery('AGENDADA'),
        buildQuery('Separado para entregar'),
        buildQuery('Finalizada'),
        buildQueryUnfiltered('Material retornado'),
        buildQuery().eq('comanda_urls', '{}').not('status', 'ilike', 'SUSPENSA'),
        qCharts,
        supabase.from('on_call').select('*').order('start_date', { ascending: true }),
        supabase.from('funcionarios').select('*'),
        qTrend
      ]);

      const recentRows = chartsRes?.data || [];

      // Processar agregações locais
      const hospitalCounts = {};
      const doctorOrtopediaCounts = {};
      const doctorBucoCounts = {};
      const vendorStatsMap = {};
      const instrumentalistStatsMap = {};
      const insuranceCounts = {};
      const surgeryTypeCounts = {};
      const caraterCounts = {};

      // Map doctors to specialty if surgery_type is specified on any of their surgeries
      const docSpecialtyMap = {};
      if (recentRows) {
        recentRows.forEach(row => {
          if (row.doctor && row.surgery_type) {
            const doc = row.doctor.trim().toUpperCase();
            const st = row.surgery_type.toUpperCase();
            if (st.includes('ORTOPEDIA') || st.includes('ORTOPÉDICA')) {
              docSpecialtyMap[doc] = 'ORTOPEDIA';
            } else if (st.includes('BUCO')) {
              docSpecialtyMap[doc] = 'BUCOMAXILO';
            }
          }
        });
      }

      // Prepare last 6 months chart data
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthlyDataMap = {};
      
      const d = new Date();
      for (let i = 5; i >= 0; i--) {
        const temp = new Date(d.getFullYear(), d.getMonth() - i, 1);
        const monthKey = `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}`;
        monthlyDataMap[monthKey] = {
          name: `${monthNames[temp.getMonth()]}`,
          Agendadas: 0,
          Finalizadas: 0,
          Suspensas: 0
        };
      }

      if (recentRows) {
        recentRows.forEach(row => {
          if (row.hospital) hospitalCounts[row.hospital] = (hospitalCounts[row.hospital] || 0) + 1;
          
          if (row.doctor) {
            const doc = row.doctor.trim();
            const docKey = doc.toUpperCase();
            const st = (row.surgery_type || '').toUpperCase();
            let spec = null;
            if (st.includes('ORTOPEDIA') || st.includes('ORTOPÉDICA')) spec = 'ORTOPEDIA';
            else if (st.includes('BUCO')) spec = 'BUCOMAXILO';
            else spec = docSpecialtyMap[docKey];

            if (spec === 'ORTOPEDIA') {
              doctorOrtopediaCounts[doc] = (doctorOrtopediaCounts[doc] || 0) + 1;
            } else if (spec === 'BUCOMAXILO') {
              doctorBucoCounts[doc] = (doctorBucoCounts[doc] || 0) + 1;
            }
          }
          
          if (row.salesperson) {
            const vp = row.salesperson;
            if (!vendorStatsMap[vp]) {
              vendorStatsMap[vp] = { name: vp, Agendadas: 0, Finalizadas: 0, Suspensas: 0 };
            }
            vendorStatsMap[vp].Agendadas++;
            const st = row.status ? row.status.toUpperCase() : '';
            if (st === 'FINALIZADA') vendorStatsMap[vp].Finalizadas++;
            if (st === 'SUSPENSA') vendorStatsMap[vp].Suspensas++;
          }

          const processInstrumentalist = (inst) => {
            if (inst) {
              if (!instrumentalistStatsMap[inst]) {
                instrumentalistStatsMap[inst] = { name: inst, Agendadas: 0, Finalizadas: 0, Suspensas: 0 };
              }
              instrumentalistStatsMap[inst].Agendadas++;
              const st = row.status ? row.status.toUpperCase() : '';
              if (st === 'FINALIZADA') instrumentalistStatsMap[inst].Finalizadas++;
              if (st === 'SUSPENSA') instrumentalistStatsMap[inst].Suspensas++;
            }
          };
          processInstrumentalist(row.instrumentalist1);
          processInstrumentalist(row.instrumentalist2);

          if (row.insurance) insuranceCounts[row.insurance] = (insuranceCounts[row.insurance] || 0) + 1;
          if (row.surgery_type) surgeryTypeCounts[row.surgery_type] = (surgeryTypeCounts[row.surgery_type] || 0) + 1;
          if (row.carater) caraterCounts[row.carater] = (caraterCounts[row.carater] || 0) + 1;
        });
      }

      const trendRows = trendRes?.data || [];
      if (trendRows) {
        trendRows.forEach(row => {
          if (row.date) {
            const dateStr = row.date; // YYYY-MM-DD
            const monthKey = dateStr.substring(0, 7); // YYYY-MM
            if (monthlyDataMap[monthKey]) {
              monthlyDataMap[monthKey].Agendadas++;
              const st = row.status ? row.status.toUpperCase() : '';
              if (st === 'FINALIZADA') {
                monthlyDataMap[monthKey].Finalizadas++;
              }
              if (st === 'SUSPENSA') {
                monthlyDataMap[monthKey].Suspensas++;
              }
            }
          }
        });
      }

      const monthlyData = Object.values(monthlyDataMap);

      const sortAndSlice = (obj, limit = 5) => {
        return Object.entries(obj)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
      };

      setStats({
        total: totalRes.count || 0,
        delivered: deliveredRes.count || 0,
        suspended: suspendedRes.count || 0,
        pendingAuth: pendingRes.count || 0,
        inSeparation: sepRes.count || 0,
        elective: eletivaRes.count || 0,
        sepDelivery: sepEntregaRes.count || 0,
        finalizada: finalizadaRes.count || 0,
        materialRetornado: materialRetornadoRes.count || 0,
        missingAnexo2: missingAnexo2Res.count || 0,
        topHospitals: sortAndSlice(hospitalCounts),
        topDoctorsOrtopedia: sortAndSlice(doctorOrtopediaCounts),
        topDoctorsBuco: sortAndSlice(doctorBucoCounts),
        topVendors: Object.values(vendorStatsMap).sort((a, b) => b.Agendadas - a.Agendadas).slice(0, 5),
        topInstrumentalists: Object.values(instrumentalistStatsMap).sort((a, b) => b.Agendadas - a.Agendadas).slice(0, 10),
        topInsurances: sortAndSlice(insuranceCounts),
        topSurgeryTypes: sortAndSlice(surgeryTypeCounts),
        topCaraters: sortAndSlice(caraterCounts),
        monthlyTrend: monthlyData
      });
      
      // Process on-call schedule
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const funcionariosData = funcionariosRes?.data || [];
      const funcColorMap = {};
      funcionariosData.forEach(f => {
        if (f.name) funcColorMap[f.name.toUpperCase()] = f.color;
      });
      
      const processedOnCall = (onCallRes?.data || []).map(item => {
        const start = new Date(item.start_date + 'T00:00:00');
        const end = new Date(item.end_date + 'T23:59:59');
        let status = 'future';
        
        if (today > end) {
          status = 'past';
        } else if (today >= start && today <= end) {
          status = 'current';
        }
        
        const formatShortDate = (d) => {
          if (!d) return '';
          const p = d.split('-');
          return `${p[2]}/${p[1]}`;
        };
        
        return {
          id: item.id,
          period: `${formatShortDate(item.start_date)} - ${formatShortDate(item.end_date)}`,
          name: item.name,
          status: status,
          color: funcColorMap[item.name?.toUpperCase()] || '#3b82f6'
        };
      }).filter(item => item.status !== 'past');
      
      setOnCallSchedule(processedOnCall);
      
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="empty-state">
          <Clock className="animate-spin" size={48} style={{ color: '#3b82f6', marginBottom: '20px' }} />
          <h3>Carregando estatísticas do Mapa...</h3>
        </div>
      </div>
    );
  }

  // Encontrar o maior valor para normalizar os progress bars das estatísticas
  const maxHospitalCount = stats.topHospitals[0]?.count || 1;
  const maxDoctorOrtopediaCount = (stats.topDoctorsOrtopedia && stats.topDoctorsOrtopedia[0]?.count) || 1;
  const maxDoctorBucoCount = (stats.topDoctorsBuco && stats.topDoctorsBuco[0]?.count) || 1;
  const maxInsuranceCount = stats.topInsurances[0]?.count || 1;
  const maxSurgeryTypeCount = stats.topSurgeryTypes[0]?.count || 1;
  const maxCaraterCount = (stats.topCaraters && stats.topCaraters[0]?.count) || 1;

  return (
    <>
      {exportModalState.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '320px', padding: '24px', textAlign: 'center', borderRadius: '16px', background: 'var(--bg-primary)' }}>
            <h3 style={{ marginBottom: '10px', color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>Exportar {exportModalState.surgeryType}</h3>
            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Como deseja exportar os dados filtrados?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="btn-primary" 
                style={{ background: '#ef4444', border: 'none' }} 
                onClick={() => exportData('pdf', exportModalState.surgeryType)}
                disabled={!!isExporting}
              >
                {isExporting === 'pdf' ? 'Gerando PDF...' : 'Gerar PDF'}
              </button>
              <button 
                className="btn-primary" 
                style={{ background: '#10b981', border: 'none' }}
                onClick={() => exportData('excel', exportModalState.surgeryType)}
                disabled={!!isExporting}
              >
                {isExporting === 'excel' ? 'Gerando Excel...' : 'Gerar Excel'}
              </button>
              <button 
                className="btn-primary" 
                style={{ background: '#3b82f6', border: 'none' }}
                onClick={() => {
                  handleNavigate({ surgery_type: exportModalState.surgeryType });
                  setExportModalState({ isOpen: false, surgeryType: '' });
                }}
              >
                <Map size={16} /> Dados no Mapa
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => setExportModalState({ isOpen: false, surgeryType: '' })}
                disabled={!!isExporting}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 className="dashboard-title">Olá, {user.name || user.email.split('@')[0].toUpperCase()}</h1>
          <p className="dashboard-subtitle">Acompanhe as métricas de agendamentos e status das entregas da Medlife.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Filtro de Período:</span>
          <select 
            className="form-input" 
            style={{ width: 'auto', minWidth: '200px', cursor: 'pointer' }}
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
          >
            <option value="all">Todo o Histórico</option>
            <option value="current_month">Mês Atual</option>
            <option value="last_month">Mês Passado</option>
            <option value="quarter">Trimestral (Últimos 3 meses)</option>
            <option value="semester">Semestral (Últimos 6 meses)</option>
            <option value="current_year">Ano Atual</option>
            <option value="last_year">Ano Passado</option>
          </select>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="kpi-grid">
        {/* KPI: Agendada */}
        <div className="kpi-card glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'AGENDADA' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">AGENDADA</span>
            <Clock size={20} style={{ color: '#a855f7' }} />
          </div>
          <div className="kpi-value" style={{ color: '#c084fc' }}>{stats.elective}</div>
          <span className="kpi-footer">Cirurgias programadas</span>
        </div>

        {/* KPI: Em separação */}
        <div className="kpi-card glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'EM SEPARACAO' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">EM SEPARAÇÃO</span>
            <PackageSearch size={20} style={{ color: '#3b82f6' }} />
          </div>
          <div className="kpi-value" style={{ color: '#60a5fa' }}>{stats.inSeparation}</div>
          <span className="kpi-footer">Materiais sendo preparados</span>
        </div>

        {/* KPI: Separado para entregar */}
        <div className="kpi-card glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'SEPARADO PARA ENTREGAR' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">Separado p/ Entrega</span>
            <PackageCheck size={20} style={{ color: '#f97316' }} />
          </div>
          <div className="kpi-value" style={{ color: '#fb923c' }}>{stats.sepDelivery}</div>
          <span className="kpi-footer">Pronto para envio</span>
        </div>

        {/* KPI: Entregues */}
        <div className="kpi-card glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'MATERIAL ENTREGUE' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">Entregues</span>
            <CheckCircle2 size={20} style={{ color: '#10b981' }} />
          </div>
          <div className="kpi-value" style={{ color: '#34d399' }}>{stats.delivered}</div>
          <span className="kpi-footer">
            {stats.total > 0 ? `${Math.round((stats.delivered / stats.total) * 100)}%` : '0%'} de aproveitamento de entregas
          </span>
        </div>

        {/* KPI: Material Retornado */}
        <div className="kpi-card glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'MATERIAL RETORNADO' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">RETORNADOS</span>
            <RefreshCw size={20} style={{ color: '#6366f1' }} />
          </div>
          <div className="kpi-value" style={{ color: '#6366f1' }}>{stats.materialRetornado}</div>
          <span className="kpi-footer">Devolução de materiais</span>
        </div>

        {/* KPI: Finalizada */}
        <div className="kpi-card glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'FINALIZADA' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">Finalizada</span>
            <CheckCircle size={20} style={{ color: '#10b981' }} />
          </div>
          <div className="kpi-value" style={{ color: '#10b981' }}>{stats.finalizada}</div>
          <span className="kpi-footer">Cirurgias concluídas</span>
        </div>

        {/* KPI: Anexo 2 Pendente */}
        <div className="kpi-card glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ missingAnexo2: true })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">COMANDA FALTANTE</span>
            <AlertCircle size={20} style={{ color: '#ef4444' }} />
          </div>
          <div className="kpi-value" style={{ color: '#ef4444' }}>{stats.missingAnexo2}</div>
          <span className="kpi-footer">Anexo 2 pendente</span>
        </div>

        {/* KPI: Suspensas */}
        <div className="kpi-card glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'SUSPENSA' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">Suspensas</span>
            <AlertTriangle size={20} style={{ color: '#ef4444' }} />
          </div>
          <div className="kpi-value" style={{ color: '#f87171' }}>{stats.suspended}</div>
          <span className="kpi-footer">Cirurgias canceladas/adiadas</span>
        </div>

        {/* KPI: Autorizadas */}
        <div className="kpi-card glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'AUTORIZADAS' }, true)} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">Autorizadas</span>
            <AlertCircle size={20} style={{ color: '#eab308' }} />
          </div>
          <div className="kpi-value" style={{ color: '#facc15' }}>{stats.pendingAuth}</div>
          <span className="kpi-footer">Cirurgias autorizadas</span>
        </div>

        {/* KPI: Total Agendado */}
        <div className="kpi-card glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({})} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">Total Agendado</span>
            <Calendar size={20} style={{ color: '#3b82f6' }} />
          </div>
          <div className="kpi-value">{stats.total}</div>
          <span className="kpi-footer">Cirurgias registradas no geral</span>
        </div>
      </div>

      {/* CHARTS / ANALYTICS SECTION */}
      <div className="charts-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        {/* Top Hospitais */}
        <div className="glass-card chart-container-card">
          <h3 className="chart-title">Hospitais Mais Atendidos (Recentes)</h3>
          {stats.topHospitals.length > 0 ? (
            <div className="chart-bar-list">
              {stats.topHospitals.map((item, idx) => (
                <div key={idx} className="chart-bar-item" style={{ cursor: 'pointer' }} onClick={() => handleNavigate({ hospital: item.name })}>
                  <span className="chart-bar-label" title={item.name}>{item.name}</span>
                  <div className="chart-bar-progress-bg">
                    <div 
                      className="chart-bar-progress-fill" 
                      style={{ 
                        width: `${(item.count / maxHospitalCount) * 100}%`,
                        background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)'
                      }}
                    ></div>
                  </div>
                  <span className="chart-bar-value">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '20px' }}>Não há dados recentes.</div>
          )}
        </div>

        {/* Top Médicos - Ortopedia */}
        <div className="glass-card chart-container-card">
          <h3 className="chart-title">Top Médicos - Ortopedia</h3>
          {stats.topDoctorsOrtopedia && stats.topDoctorsOrtopedia.length > 0 ? (
            <div className="chart-bar-list">
              {stats.topDoctorsOrtopedia.map((item, idx) => (
                <div key={idx} className="chart-bar-item" style={{ cursor: 'pointer' }} onClick={() => handleNavigate({ doctor: item.name, surgery_type: 'ORTOPEDIA' })}>
                  <span className="chart-bar-label" title={item.name}>{item.name}</span>
                  <div className="chart-bar-progress-bg">
                    <div 
                      className="chart-bar-progress-fill" 
                      style={{ 
                        width: `${(item.count / maxDoctorOrtopediaCount) * 100}%`,
                        background: 'linear-gradient(90deg, #8b5cf6 0%, #6d28d9 100%)' 
                      }}
                    ></div>
                  </div>
                  <span className="chart-bar-value">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '20px' }}>Não há dados recentes.</div>
          )}
        </div>

        {/* Top Médicos - Bucomaxilo */}
        <div className="glass-card chart-container-card">
          <h3 className="chart-title">Top Médicos - Bucomaxilo</h3>
          {stats.topDoctorsBuco && stats.topDoctorsBuco.length > 0 ? (
            <div className="chart-bar-list">
              {stats.topDoctorsBuco.map((item, idx) => (
                <div key={idx} className="chart-bar-item" style={{ cursor: 'pointer' }} onClick={() => handleNavigate({ doctor: item.name, surgery_type: 'BUCOMAXILO' })}>
                  <span className="chart-bar-label" title={item.name}>{item.name}</span>
                  <div className="chart-bar-progress-bg">
                    <div 
                      className="chart-bar-progress-fill" 
                      style={{ 
                        width: `${(item.count / maxDoctorBucoCount) * 100}%`,
                        background: 'linear-gradient(90deg, #06b6d4 0%, #0891b2 100%)' 
                      }}
                    ></div>
                  </div>
                  <span className="chart-bar-value">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '20px' }}>Não há dados recentes.</div>
          )}
        </div>

        {/* Pronto Aviso */}
        <div className="glass-card chart-container-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px', borderBottom: '1px solid var(--border-glass)' }}>
            <span style={{ fontWeight: '700', letterSpacing: '1px' }}>PRONTO AVISO</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setIsOnCallHistoryModalOpen(true)}
                className="btn-icon" 
                style={{ padding: '6px' }}
                title="histórico do sobreaviso"
              >
                <History size={16} />
              </button>
              {(!user.permissions?.can_view_only && (user.role === 'Admin' || user.role === 'Gerente' || user.permissions?.allowed_edit_fields?.includes('manage_on_call'))) && (
                <button 
                  onClick={() => setIsOnCallModalOpen(true)}
                  className="btn-icon" 
                  style={{ padding: '6px' }}
                  title="cadastra escala do sobre aviso"
                >
                  <Settings size={16} />
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', overflowY: 'auto' }}>
            {onCallSchedule.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Nenhuma escala configurada.
              </div>
            ) : onCallSchedule.map((item, idx) => {
              const hexToRgba = (hex, alpha) => {
                if (!hex || !hex.startsWith('#')) return 'transparent';
                const r = parseInt(hex.slice(1, 3), 16) || 0;
                const g = parseInt(hex.slice(3, 5), 16) || 0;
                const b = parseInt(hex.slice(5, 7), 16) || 0;
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
              };

              let bg = hexToRgba(item.color, 0.15);
              let textColor = item.color;
              let fontWeight = '500';
              
              if (item.status === 'past') {
                bg = 'transparent';
                textColor = 'var(--text-muted)';
              } else if (item.status === 'current') {
                bg = hexToRgba(item.color, 0.3);
                fontWeight = '700';
              }

              return (
                <div key={idx} style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  padding: '12px 16px', 
                  background: bg, 
                  color: textColor,
                  borderBottom: '1px solid var(--border-glass)',
                  fontWeight: fontWeight,
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  flex: 1
                }}>
                  <div style={{ textAlign: 'center' }}>{item.period}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }}></div>
                    {item.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="charts-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

        {/* Top Convênios */}
        <div className="glass-card chart-container-card" style={{ height: 'auto', minHeight: '300px' }}>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} style={{ color: '#10b981' }} /> Convênios Mais Atendidos
          </h3>
          {stats.topInsurances.length > 0 ? (
            <div className="chart-bar-list">
              {stats.topInsurances.map((item, idx) => (
                <div key={idx} className="chart-bar-item" style={{ cursor: 'pointer' }} onClick={() => handleNavigate({ insurance: item.name })}>
                  <span className="chart-bar-label" title={item.name}>{item.name}</span>
                  <div className="chart-bar-progress-bg">
                    <div 
                      className="chart-bar-progress-fill" 
                      style={{ 
                        width: `${(item.count / maxInsuranceCount) * 100}%`,
                        background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)' 
                      }}
                    ></div>
                  </div>
                  <span className="chart-bar-value">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '20px' }}>Não há dados recentes.</div>
          )}
        </div>

        {/* Top Tipos de Cirurgia */}
        <div className="glass-card chart-container-card" style={{ height: 'auto', minHeight: '300px' }}>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} style={{ color: '#ec4899' }} /> Top Tipos de Cirurgia
          </h3>
          {stats.topSurgeryTypes.length > 0 ? (
            <div className="chart-bar-list">
              {stats.topSurgeryTypes.map((item, idx) => {
                const isSelected = exportModalState.isOpen && exportModalState.surgeryType === item.name;
                const nameUpper = item.name.toUpperCase();
                const getBarColor = () => {
                  if (nameUpper.includes('ORTOPEDIA') || nameUpper.includes('ORTOPÉDICA')) return 'linear-gradient(90deg, #8b5cf6 0%, #6d28d9 100%)';
                  if (nameUpper.includes('BUCO')) return 'linear-gradient(90deg, #06b6d4 0%, #0891b2 100%)';
                  return 'linear-gradient(90deg, #ec4899 0%, #be185d 100%)';
                };
                const getSelectColor = () => {
                  if (nameUpper.includes('ORTOPEDIA') || nameUpper.includes('ORTOPÉDICA')) return { bg: 'rgba(139, 92, 246, 0.1)', shadow: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)' };
                  if (nameUpper.includes('BUCO')) return { bg: 'rgba(6, 182, 212, 0.1)', shadow: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.3)' };
                  return { bg: 'rgba(236, 72, 153, 0.1)', shadow: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)' };
                };
                const selColors = getSelectColor();
                return (
                  <div 
                    key={idx} 
                    className="chart-bar-item" 
                    style={{ 
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease',
                      backgroundColor: isSelected ? selColors.bg : 'transparent',
                      boxShadow: isSelected ? `0 4px 12px ${selColors.shadow}` : 'none',
                      border: isSelected ? `1px solid ${selColors.border}` : '1px solid transparent'
                    }} 
                    onClick={() => setExportModalState({ isOpen: true, surgeryType: item.name })}
                  >
                    <span className="chart-bar-label" title={item.name}>{item.name}</span>
                    <div className="chart-bar-progress-bg">
                      <div 
                        className="chart-bar-progress-fill" 
                        style={{ 
                          width: `${(item.count / maxSurgeryTypeCount) * 100}%`,
                          background: getBarColor() 
                        }}
                      ></div>
                    </div>
                    <span className="chart-bar-value">{item.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '20px' }}>Não há dados recentes.</div>
          )}
        </div>

        {/* Caráter das Cirurgias */}
        <div className="glass-card chart-container-card" style={{ height: 'auto', minHeight: '300px' }}>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={20} style={{ color: '#a855f7' }} /> Caráter das Cirurgias
          </h3>
          {stats.topCaraters && stats.topCaraters.length > 0 ? (
            <div className="chart-bar-list">
              {stats.topCaraters.map((item, idx) => (
                <div key={idx} className="chart-bar-item" style={{ cursor: 'pointer' }} onClick={() => handleNavigate({ carater: item.name })}>
                  <span className="chart-bar-label" title={item.name}>{item.name}</span>
                  <div className="chart-bar-progress-bg">
                    <div 
                      className="chart-bar-progress-fill" 
                      style={{ 
                        width: `${(item.count / maxCaraterCount) * 100}%`,
                        background: (item.name === 'URGÊNCIA' || item.name === 'URGENCIA')
                          ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)' 
                          : (item.name === 'JUDICIAL' 
                            ? 'linear-gradient(90deg, #a855f7 0%, #7e22ce 100%)' 
                            : 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)') 
                      }}
                    ></div>
                  </div>
                  <span className="chart-bar-value">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '20px' }}>Não há dados recentes.</div>
          )}
        </div>

      </div>

      {/* PERFORMANCE DE VENDAS (BAR CHART) */}
      {user.role !== 'Vendedor' && (
        <div className="glass-card" style={{ marginTop: '24px', padding: '20px' }}>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Award size={20} style={{ color: '#fbbf24' }} /> Performance de Vendas (Top Vendedores)
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            {stats.topVendors.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={stats.topVendors} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'var(--border-glass)', color: 'var(--text-primary)', borderRadius: '8px' }}
                    itemStyle={{ color: '#60a5fa' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="Agendadas" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="Agendadas" position="top" fill="var(--text-secondary)" fontSize={11} formatter={(val) => val > 0 ? val : ''} />
                  </Bar>
                  <Bar dataKey="Finalizadas" fill="#10b981" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="Finalizadas" position="top" fill="var(--text-secondary)" fontSize={11} formatter={(val) => val > 0 ? val : ''} />
                  </Bar>
                  <Bar dataKey="Suspensas" fill="#ef4444" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="Suspensas" position="top" fill="var(--text-secondary)" fontSize={11} formatter={(val) => val > 0 ? val : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '20px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Não há dados recentes.</div>
            )}
          </div>
        </div>
      )}

      {/* PERFORMANCE DE INSTRUMENTADORES (BAR CHART) */}
      <div className="glass-card" style={{ marginTop: '24px', padding: '20px' }}>
        <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Award size={20} style={{ color: '#34d399' }} /> Performance de Instrumentadores (Top 10)
        </h3>
        <div style={{ width: '100%', height: 300 }}>
          {stats.topInstrumentalists && stats.topInstrumentalists.length > 0 ? (
            <ResponsiveContainer>
              <BarChart data={stats.topInstrumentalists} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'var(--border-glass)', color: 'var(--text-primary)', borderRadius: '8px' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="Agendadas" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Agendadas" position="top" fill="var(--text-secondary)" fontSize={11} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="Finalizadas" fill="#10b981" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Finalizadas" position="top" fill="var(--text-secondary)" fontSize={11} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="Suspensas" fill="#ef4444" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Suspensas" position="top" fill="var(--text-secondary)" fontSize={11} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '20px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Não há dados recentes.</div>
          )}
        </div>
      </div>

      {/* EVOLUÇÃO MENSAL (BAR CHART) */}
      <div className="glass-card" style={{ marginTop: '24px', marginBottom: '24px', padding: '20px' }}>
        <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <TrendingUp size={20} style={{ color: '#3b82f6' }} /> Comparativo Mensal (Últimos 6 Meses)
        </h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={stats.monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'var(--border-glass)', color: 'var(--text-primary)', borderRadius: '8px' }}
                itemStyle={{ color: '#60a5fa' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="Agendadas" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="Agendadas" position="top" fill="var(--text-secondary)" fontSize={11} formatter={(val) => val > 0 ? val : ''} />
              </Bar>
              <Bar dataKey="Finalizadas" fill="#10b981" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="Finalizadas" position="top" fill="var(--text-secondary)" fontSize={11} formatter={(val) => val > 0 ? val : ''} />
              </Bar>
              <Bar dataKey="Suspensas" fill="#ef4444" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="Suspensas" position="top" fill="var(--text-secondary)" fontSize={11} formatter={(val) => val > 0 ? val : ''} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>


      <OnCallModal 
        isOpen={isOnCallModalOpen} 
        onClose={() => setIsOnCallModalOpen(false)} 
        onScheduleUpdated={fetchStats}
      />
      <OnCallHistoryModal 
        isOpen={isOnCallHistoryModalOpen} 
        onClose={() => setIsOnCallHistoryModalOpen(false)} 
      />

      {/* Hidden container for PDF export */}
      {printData && (
        <div style={{ display: 'none' }}>
          <div id="dashboard-print-container" style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fff', color: '#000' }}>
            <h1 style={{ textAlign: 'center', color: '#1e293b', marginBottom: '20px', fontSize: '18px' }}>
              {printTitle}
            </h1>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
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
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Instr. 1</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Instr. 2</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Vendedor</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Obs.</th>
                </tr>
              </thead>
              <tbody>
                {printData.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>
                      {item.date ? new Date(item.date).toLocaleDateString('pt-BR') : ''}
                      {item.time ? <br /> : ''}
                      {item.time ? item.time : ''}
                    </td>
                    <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>{item.status}</td>
                    <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>{item.doctor}</td>
                    <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>{item.hospital}</td>
                    <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>{item.patient}</td>
                    <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>{item.insurance}</td>
                    <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>{item.surgery_type}</td>
                    <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>{item.material_procedure}</td>
                    <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>{item.instrumentalist1}</td>
                    <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>{item.instrumentalist2}</td>
                    <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>{item.salesperson}</td>
                    <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>{item.observation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '20px', textAlign: 'right', fontSize: '10px', color: '#64748b' }}>
              Gerado em: {new Date().toLocaleString('pt-BR')} - Total: {printData.length} registros
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default function Dashboard(props) {
  return (
    <DashboardErrorBoundary>
      <DashboardInner {...props} />
    </DashboardErrorBoundary>
  );
}
