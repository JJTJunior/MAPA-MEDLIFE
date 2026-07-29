const activeTabs = ['status', 'medicos', 'funcionarios', 'carater', 'surgery_types'];
const items = [{ name: null, id: 1 }, { name: 'João|CRM:123', id: 2 }, { name: '🔴|Suspensa', id: 3 }, { name: 'Teste', id: 4 }];

activeTabs.forEach(activeTab => {
  items.forEach(item => {
    try {
      const rawItemName = item.name || '';
      const itemName = activeTab === 'status' && rawItemName.includes('|') 
        ? rawItemName.split('|')[1] 
        : (activeTab === 'medicos' && rawItemName.includes('|CRM:') ? rawItemName.split('|CRM:')[0] : rawItemName);
      const itemCrm = activeTab === 'medicos' && rawItemName.includes('|CRM:') ? rawItemName.split('|CRM:')[1] : null;

      if (activeTab === 'status' && rawItemName.includes('|')) {
         const parts = rawItemName.split('|');
         const first = parts[0];
      }
    } catch(e) {
      console.error(`Crash in ${activeTab} with ${item.name}:`, e);
    }
  });
});
console.log('All combinations tested');
