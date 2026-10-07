import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:./sqlite.db' });

async function run() {
  await client.execute('DELETE FROM fit_analyses');
  await client.execute('DELETE FROM jobs');
  console.log('Tabelas de vagas (jobs) e matches (fit_analyses) foram limpas com sucesso!');
}
run();
