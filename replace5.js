const fs = require('fs');
let code = fs.readFileSync('c:/MAPA MEDLIFE/frontend/src/components/Dashboard.jsx', 'utf8');

code = code.replace(
  /        suspendedRes,\r?\n        urgentRes,\r?\n        pendingRes,/,
          suspendedRes,
        pendingRes,
);

code = code.replace(
  /        buildQuery\('Suspensa'\),\r?\n        buildQuery\('Urgência'\),\r?\n        buildQuery\('Aguardando autorização'\),/,
          buildQuery('Suspensa'),
        buildQuery('Aguardando autorização'),
);

code = code.replace(
  /buildQuery\('Eletiva'\)/,
  uildQuery('Aprovada')
);

// Delete KPI 4 Urgent
code = code.replace(
  /        \{\/\* KPI 4 \*\/\}[\s\S]*?<span className="kpi-footer">Cirurgias emergenciais ativas<\/span>\r?\n        <\/div>/,
  `
);

// Change KPI 8 Eletiva to Aprovada
code = code.replace(
  /handleNavigate\(\{ status: 'ELETIVA' \}\)/,
  handleNavigate({ status: 'APROVADA' })
);
code = code.replace(
  /<span className="kpi-title">Eletiva<\/span>/,
  <span className="kpi-title">Aprovada</span>
);

fs.writeFileSync('c:/MAPA MEDLIFE/frontend/src/components/Dashboard.jsx', code);
console.log('Success');
