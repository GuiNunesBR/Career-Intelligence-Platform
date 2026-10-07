import * as dotenv from 'dotenv';
dotenv.config();

async function testJSearch() {
  const apiKey = process.env.RAPID_API_KEY || process.env.RAPIDAPI_KEY;
  if (!apiKey || apiKey === 'YOUR_RAPIDAPI_KEY') {
    console.error('API Key ausente ou padrão.');
    return;
  }
  console.log('Testing JSearch with API Key:', apiKey.substring(0, 5) + '...');
  
  const query = `Developer in USA`;
  const url = `https://jsearch.p.rapidapi.com/search-v2?query=${encodeURIComponent(query)}&page=1&num_pages=1`;
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    });
    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Body:', text.substring(0, 200));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
testJSearch();
