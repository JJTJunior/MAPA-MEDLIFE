const fs = require('fs');
const content = fs.readFileSync('c:/MAPA MEDLIFE/frontend/src/components/Dashboard.jsx', 'utf8');

const kpiRegex = /\{\/\* KPI GRID \*\/\}\r?\n\s+<div className="kpi-grid">([\s\S]*?)<\/div>\r?\n\r?\n\s+\{\/\* CHARTS \/ ANALYTICS SECTION \*\/\}/;
const match = content.match(kpiRegex);

if (!match) {
  console.log('KPI grid not found');
  process.exit(1);
}

const innerGrid = match[1];
// We can split the inner grid by         {/* KPI
const blocks = innerGrid.split(/(\s*\{\/\*\s*KPI\s+.*?\*\/\}\s*<div className="kpi-card[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*)/g);

const kpis = {};

blocks.forEach(b => {
  if (b.includes('Total Agendado')) kpis.total = b;
  else if (b.includes('Entregues')) kpis.entregues = b;
  else if (b.includes('Suspensas')) kpis.suspensas = b;
  else if (b.includes('Aguardando Autoriza')) kpis.aguardando = b;
  else if (b.includes('Em Separa')) kpis.separacao = b;
  else if (b.includes('Separado p/ Entrega')) kpis.separado = b;
  else if (b.includes('Aprovada')) kpis.aprovada = b;
  else if (b.includes('Finalizada')) kpis.finalizada = b;
  else if (b.includes('Mat. Retornado')) kpis.retornado = b;
});

const newOrder = [
  kpis.aguardando,
  kpis.aprovada,
  kpis.separacao,
  kpis.separado,
  kpis.entregues,
  kpis.retornado,
  kpis.finalizada,
  kpis.suspensas,
  kpis.total
];

const newInnerGrid = "\n" + newOrder.join('') + "\n      ";

const newContent = content.replace(match[1], newInnerGrid);

fs.writeFileSync('c:/MAPA MEDLIFE/frontend/src/components/Dashboard.jsx', newContent);
console.log('Reordered successfully');
