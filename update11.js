const fs = require('fs');

function fixUserManagement() {
  const path = 'c:/MAPA MEDLIFE/frontend/src/components/UserManagement.jsx';
  let content = fs.readFileSync(path, 'utf8');

  // Add comanda_urls to the groups structure
  content = content.replace(
    /"Adicionais \(Mapa\)": \['observation', 'attachment_url', 'delete', 'manage_on_call', 'create_surgery', 'import_surgery'\],/g,
    "\"Adicionais (Mapa)\": ['observation', 'attachment_url', 'comanda_urls', 'delete', 'manage_on_call', 'create_surgery', 'import_surgery'],"
  );
  
  // Just in case it's formatted differently
  content = content.replace(
    /'observation', 'attachment_url', 'delete'/g,
    "'observation', 'attachment_url', 'comanda_urls', 'delete'"
  );

  fs.writeFileSync(path, content, 'utf8');
}

fixUserManagement();
