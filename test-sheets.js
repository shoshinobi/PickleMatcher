import { getPlayers, addPlayer } from './lib/sheets.js';

async function testConnection() {
  try {
    console.log('Testing Google Sheets connection...');
    
    console.log('\nTrying to load players...');
    const players = await getPlayers();
    console.log('✅ Success! Current players:', players);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testConnection();