import { listSheetNames, listSheetHeaders } from '@/lib/sheets.js';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const sheetName = url.searchParams.get('sheet');
    
    if (sheetName) {
      const headers = await listSheetHeaders(sheetName);
      return Response.json({ sheetName, headers });
    } else {
      const sheets = await listSheetNames();
      return Response.json({ sheets });
    }
  } catch (error) {
    console.error('Debug API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}