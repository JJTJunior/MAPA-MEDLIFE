const items = [{ name: null }, { name: 'João|CRM:123' }, { name: '🔴|Suspensa' }];
const activeTab = 'medicos';
const searchTerm = '';

try {
  const filteredItems = items.filter(item => {
    const rawItemName = item.name || '';
    let itemName = rawItemName;
    if (activeTab === 'status' && rawItemName.includes('|')) itemName = rawItemName.split('|')[1];
    else if (activeTab === 'medicos' && rawItemName.includes('|CRM:')) itemName = rawItemName.split('|CRM:')[0];
    return itemName.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => {
    let nameA = (a.name || '').includes('|') ? (a.name.split('|')[1] || a.name) : (a.name || '');
    if (activeTab === 'medicos' && (a.name || '').includes('|CRM:')) nameA = a.name.split('|CRM:')[0];
    let nameB = (b.name || '').includes('|') ? (b.name.split('|')[1] || b.name) : (b.name || '');
    if (activeTab === 'medicos' && (b.name || '').includes('|CRM:')) nameB = b.name.split('|CRM:')[0];
    return nameA.localeCompare(nameB);
  });
  console.log("Success:", filteredItems);
} catch (e) {
  console.error("Crash:", e);
}
