const url = 'https://yslaetfxnsdgntqiqbxa.supabase.co/rest/v1/medicos?name=like.TESTE%25';
const key = 'sb_publishable_SbGEToIs2nHojuQG2DGEig_eRNQw5iF';

async function testDelete() {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await res.json();
  console.log("Medicos found:", data);

  if (data.length > 0) {
    const id = data[0].id;
    console.log(`Trying to delete medico with id ${id}`);
    
    const delRes = await fetch(`https://yslaetfxnsdgntqiqbxa.supabase.co/rest/v1/medicos?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=representation'
      }
    });
    
    if (!delRes.ok) {
      const err = await delRes.json();
      console.log("Delete failed:", err);
    } else {
      console.log("Delete succeeded:", await delRes.json());
    }
  }
}

testDelete();
