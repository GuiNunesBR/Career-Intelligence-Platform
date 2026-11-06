import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('Fetching models...');
    const response = await ai.models.list();
    console.log('Available models:');
    for (const model of response.models || []) {
      console.log(model.name);
    }
  } catch(e) {
    console.error('Error fetching models:', e);
  }
}
run();
