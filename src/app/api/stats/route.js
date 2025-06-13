import { getStats } from '@/lib/sheets.js';

export async function GET() {
  try {
    const stats = await getStats();
    return Response.json({ stats });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}