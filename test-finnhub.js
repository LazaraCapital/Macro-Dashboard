const axios = require('axios');
const FINNHUB_API_KEY = 'd25dq01r01qns40efcj0d25dq01r01qns40efcjg';

async function testFinnhub() {
  console.log('Testing Finnhub API...\n');
  
  // Test 1: Market News
  try {
    const newsResponse = await axios.get('https://finnhub.io/api/v1/news', {
      params: {
        category: 'forex',
        token: FINNHUB_API_KEY
      }
    });
    console.log('✓ Forex/Economy News:', newsResponse.data.length, 'articles found');
    console.log('Sample headlines:');
    newsResponse.data.slice(0, 3).forEach(article => {
      console.log('-', article.headline);
    });
  } catch (error) {
    console.error('✗ News API Error:', error.message);
  }
  
  // Test 2: Economic Calendar
  try {
    console.log('\nFetching Economic Calendar...');
    const calendarResponse = await axios.get('https://finnhub.io/api/v1/calendar/economic', {
      params: {
        token: FINNHUB_API_KEY
      }
    });
    const events = calendarResponse.data.economicCalendar || [];
    console.log('✓ Economic Calendar:', events.length, 'events found');
    if (events.length > 0) {
      console.log('Next few events:');
      events.slice(0, 3).forEach(event => {
        console.log(`- ${event.event} (${event.country})`);
      });
    }
  } catch (error) {
    console.error('✗ Calendar API Error:', error.message);
  }
}

testFinnhub();
