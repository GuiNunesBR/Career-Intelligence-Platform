import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config();

async function testFetch() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return console.error('No key');
  
  // Tentar listar modelos via REST API
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  const res = await fetch(url);
  const json = await res.json();
  console.log('--- MODELS LIST VIA REST ---');
  if (json.models) {
    const models = json.models.map((m: any) => m.name);
    console.log(models.join('\n'));
  } else {
    console.log(JSON.stringify(json, null, 2));
  }
}

testFetch();
