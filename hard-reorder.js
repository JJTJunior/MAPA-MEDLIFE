const fs = require('fs');
let content = fs.readFileSync('c:/MAPA MEDLIFE/frontend/src/components/Dashboard.jsx', 'utf8');

const startIndex = content.indexOf('{/* KPI GRID */}');
const endIndex = content.indexOf('{/* CHARTS / ANALYTICS SECTION */}');

const before = content.substring(0, startIndex);
const after = content.substring(endIndex);

const newGrid = "{/* KPI GRID */}\n" +
"      <div className=\"kpi-grid\">\n" +
"        {/* KPI: Aguardando Autorização */}\n" +
"        <div className=\"kpi-card glass-card\" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'AGUARDANDO AUTORIZAÇÃO' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>\n" +
"          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>\n" +
"            <span className=\"kpi-title\">Aguardando Autorização</span>\n" +
"            <AlertCircle size={20} style={{ color: '#eab308' }} />\n" +
"          </div>\n" +
"          <div className=\"kpi-value\" style={{ color: '#facc15' }}>{stats.pendingAuth}</div>\n" +
"          <span className=\"kpi-footer\">Aguardando liberação</span>\n" +
"        </div>\n" +
"\n" +
"        {/* KPI: Aprovada */}\n" +
"        <div className=\"kpi-card glass-card\" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'APROVADA' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>\n" +
"          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>\n" +
"            <span className=\"kpi-title\">Aprovada</span>\n" +
"            <Clock size={20} style={{ color: '#a855f7' }} />\n" +
"          </div>\n" +
"          <div className=\"kpi-value\" style={{ color: '#c084fc' }}>{stats.elective}</div>\n" +
"          <span className=\"kpi-footer\">Cirurgias programadas</span>\n" +
"        </div>\n" +
"\n" +
"        {/* KPI: Em separação */}\n" +
"        <div className=\"kpi-card glass-card\" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'EM SEPARAÇÃO' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>\n" +
"          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>\n" +
"            <span className=\"kpi-title\">Em Separação</span>\n" +
"            <PackageSearch size={20} style={{ color: '#3b82f6' }} />\n" +
"          </div>\n" +
"          <div className=\"kpi-value\" style={{ color: '#60a5fa' }}>{stats.inSeparation}</div>\n" +
"          <span className=\"kpi-footer\">Materiais sendo preparados</span>\n" +
"        </div>\n" +
"\n" +
"        {/* KPI: Separado para entregar */}\n" +
"        <div className=\"kpi-card glass-card\" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'SEPARADO PARA ENTREGAR' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>\n" +
"          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>\n" +
"            <span className=\"kpi-title\">Separado p/ Entrega</span>\n" +
"            <PackageCheck size={20} style={{ color: '#f97316' }} />\n" +
"          </div>\n" +
"          <div className=\"kpi-value\" style={{ color: '#fb923c' }}>{stats.sepDelivery}</div>\n" +
"          <span className=\"kpi-footer\">Pronto para envio</span>\n" +
"        </div>\n" +
"\n" +
"        {/* KPI: Entregues */}\n" +
"        <div className=\"kpi-card glass-card\" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'MATERIAL ENTREGUE' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>\n" +
"          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>\n" +
"            <span className=\"kpi-title\">Entregues</span>\n" +
"            <CheckCircle2 size={20} style={{ color: '#10b981' }} />\n" +
"          </div>\n" +
"          <div className=\"kpi-value\" style={{ color: '#34d399' }}>{stats.delivered}</div>\n" +
"          <span className=\"kpi-footer\">\n" +
"            {stats.total > 0 ? ${Math.round((stats.delivered / stats.total) * 100)}% : '0%'} de aproveitamento de entregas\n" +
"          </span>\n" +
"        </div>\n" +
"\n" +
"        {/* KPI: Material Retornado */}\n" +
"        <div className=\"kpi-card glass-card\" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'MATERIAL RETORNADO' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>\n" +
"          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>\n" +
"            <span className=\"kpi-title\">Mat. Retornado</span>\n" +
"            <RefreshCw size={20} style={{ color: '#6366f1' }} />\n" +
"          </div>\n" +
"          <div className=\"kpi-value\" style={{ color: '#6366f1' }}>{stats.materialRetornado}</div>\n" +
"          <span className=\"kpi-footer\">Devolução de materiais</span>\n" +
"        </div>\n" +
"\n" +
"        {/* KPI: Finalizada */}\n" +
"        <div className=\"kpi-card glass-card\" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'FINALIZADA' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>\n" +
"          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>\n" +
"            <span className=\"kpi-title\">Finalizada</span>\n" +
"            <CheckCircle size={20} style={{ color: '#10b981' }} />\n" +
"          </div>\n" +
"          <div className=\"kpi-value\" style={{ color: '#10b981' }}>{stats.finalizada}</div>\n" +
"          <span className=\"kpi-footer\">Cirurgias concluídas</span>\n" +
"        </div>\n" +
"\n" +
"        {/* KPI: Suspensas */}\n" +
"        <div className=\"kpi-card glass-card\" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({ status: 'SUSPENSA' })} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>\n" +
"          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>\n" +
"            <span className=\"kpi-title\">Suspensas</span>\n" +
"            <AlertTriangle size={20} style={{ color: '#ef4444' }} />\n" +
"          </div>\n" +
"          <div className=\"kpi-value\" style={{ color: '#f87171' }}>{stats.suspended}</div>\n" +
"          <span className=\"kpi-footer\">Cirurgias canceladas/adiadas</span>\n" +
"        </div>\n" +
"\n" +
"        {/* KPI: Total Agendado */}\n" +
"        <div className=\"kpi-card glass-card\" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleNavigate({})} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>\n" +
"          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>\n" +
"            <span className=\"kpi-title\">Total Agendado</span>\n" +
"            <Calendar size={20} style={{ color: '#3b82f6' }} />\n" +
"          </div>\n" +
"          <div className=\"kpi-value\">{stats.total}</div>\n" +
"          <span className=\"kpi-footer\">Cirurgias registradas no histórico</span>\n" +
"        </div>\n" +
"      </div>\n\n      ";

const newContent = before + newGrid + after;
fs.writeFileSync('c:/MAPA MEDLIFE/frontend/src/components/Dashboard.jsx', newContent);
console.log('Successfully reordered KPIs');
