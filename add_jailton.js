const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;

const client = new Client({
  connectionString: connectionString,
});

async function addSurgery() {
  try {
    await client.connect();
    
    // Get a random doctor
    const docRes = await client.query('SELECT name FROM public.medicos LIMIT 1');
    const doctor = docRes.rows.length > 0 ? docRes.rows[0].name : 'Médico Desconhecido';

    // Get a random hospital
    const hospRes = await client.query('SELECT name FROM public.hospitais LIMIT 1');
    const hospital = hospRes.rows.length > 0 ? hospRes.rows[0].name : 'Hospital Desconhecido';

    const patient = 'jailton teste';
    const date = '2026-08-05';
    const time = '12:00';
    const status = 'ELETIVA';
    const sheet_name = 'Inclusão Manual';

    const query = `
      INSERT INTO public.surgeries (patient, doctor, hospital, date, time, status, sheet_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [patient, doctor, hospital, date, time, status, sheet_name];

    const res = await client.query(query, values);
    console.log('Cirurgia inserida com sucesso!');
    console.log(res.rows[0]);
  } catch (err) {
    console.error('Erro ao inserir cirurgia:', err);
  } finally {
    await client.end();
  }
}

addSurgery();
