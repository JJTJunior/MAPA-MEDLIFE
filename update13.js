const fs = require('fs');

function fixDashboardDates() {
  const path = 'c:/MAPA MEDLIFE/frontend/src/components/Dashboard.jsx';
  let content = fs.readFileSync(path, 'utf8');

  const start1 = content.indexOf('const getStartDate = () => {');
  const end1 = content.indexOf('const getEndDate = () => {');
  const start2 = end1;
  const end2 = content.indexOf('const handleNavigate = (filters) => {');

  if (start1 !== -1 && end1 !== -1 && start2 !== -1 && end2 !== -1) {
    const newGetStartDate = `const getStartDate = () => {
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
    return \`\${year}-\${month}-\${day}\`;
  };

  `;

    const newGetEndDate = `const getEndDate = () => {
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
    return \`\${year}-\${month}-\${day}\`;
  };

  `;

    content = content.substring(0, start1) + newGetStartDate + newGetEndDate + content.substring(end2);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully updated Dashboard.jsx');
  } else {
    console.log('Failed to find start/end indices.');
  }
}

fixDashboardDates();
