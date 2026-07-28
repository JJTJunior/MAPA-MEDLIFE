const fs = require('fs');
let code = fs.readFileSync('c:/MAPA MEDLIFE/frontend/src/components/Dashboard.jsx', 'utf8');

const t1 =         sepEntregaRes,
        chartsRes,
        onCallRes,;
const r1 =         sepEntregaRes,
        finalizadaRes,
        materialRetornadoRes,
        chartsRes,
        onCallRes,;

const t2 =         buildQuery('Separado para entregar'),
        qCharts,
        supabase.from('on_call').select('*').order('start_date', { ascending: true }),;
const r2 =         buildQuery('Separado para entregar'),
        buildQuery('Finalizada'),
        buildQuery('Material retornado'),
        qCharts,
        supabase.from('on_call').select('*').order('start_date', { ascending: true }),;

const t3 =         sepDelivery: sepEntregaRes.count || 0,
        topHospitals: sortAndSlice(hospitalCounts),;
const r3 =         sepDelivery: sepEntregaRes.count || 0,
        finalizada: finalizadaRes.count || 0,
        materialRetornado: materialRetornadoRes.count || 0,
        topHospitals: sortAndSlice(hospitalCounts),;

const t4 =         {/* KPI 8: Eletiva */}
        <div className="kpi-card glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'ELETIVA' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">Eletiva</span>
            <Clock size={20} style={{ color: '#a855f7' }} />
          </div>
          <div className="kpi-value" style={{ color: '#c084fc' }}>{stats.elective}</div>
          <span className="kpi-footer">Cirurgias programadas</span>
        </div>
      </div>;
const r4 =         {/* KPI 8: Eletiva */}
        <div className="kpi-card glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'ELETIVA' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">Eletiva</span>
            <Clock size={20} style={{ color: '#a855f7' }} />
          </div>
          <div className="kpi-value" style={{ color: '#c084fc' }}>{stats.elective}</div>
          <span className="kpi-footer">Cirurgias programadas</span>
        </div>

        {/* KPI 9: Finalizada */}
        <div className="kpi-card glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'FINALIZADA' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">Finalizada</span>
            <CheckCircle size={20} style={{ color: '#10b981' }} />
          </div>
          <div className="kpi-value" style={{ color: '#10b981' }}>{stats.finalizada}</div>
          <span className="kpi-footer">Cirurgias concluídas</span>
        </div>

        {/* KPI 10: Material Retornado */}
        <div className="kpi-card glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'MATERIAL RETORNADO' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">Mat. Retornado</span>
            <RefreshCw size={20} style={{ color: '#6366f1' }} />
          </div>
          <div className="kpi-value" style={{ color: '#6366f1' }}>{stats.materialRetornado}</div>
          <span className="kpi-footer">Devolução de materiais</span>
        </div>
      </div>;

if (code.includes(t1) && code.includes(t2) && code.includes(t3) && code.includes(t4)) {
  code = code.replace(t1, r1).replace(t2, r2).replace(t3, r3).replace(t4, r4);
  fs.writeFileSync('c:/MAPA MEDLIFE/frontend/src/components/Dashboard.jsx', code);
  console.log('Success');
} else {
  console.log('Failed to find one or more targets');
}
