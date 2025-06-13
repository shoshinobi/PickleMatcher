import { getPlayers, addPlayers, removePlayer, clearAllPlayers } from '@/lib/sheets';

export async function GET() {
  try {
    const players = await getPlayers();
    return Response.json({ players });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { action, names, name } = data;
    
    let result = false;
    
    switch (action) {
      case 'add':
        if (Array.isArray(names) && names.length > 0) {
          result = await addPlayers(names);
        }
        break;
      case 'remove':
        if (name) {
          result = await removePlayer(name);
        }
        break;
      case 'clear':
        result = await clearAllPlayers();
        break;
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    return Response.json({ success: result });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}