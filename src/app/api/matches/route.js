import { getMatches, addMatch, removeMatch, updatePlayerStats } from '@/lib/sheets.js';

export async function GET() {
  try {
    const matches = await getMatches();
    return Response.json({ matches });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { action, matchData, matchId } = await request.json();
    
    if (action === 'add' && matchData) {
      const id = await addMatch(matchData);
      // Update stats when a match is added
      await updatePlayerStats(matchData);
      return Response.json({ success: true, id });
    } else if (action === 'remove' && matchId) {
      const success = await removeMatch(matchId);
      return Response.json({ success });
    }
    
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}