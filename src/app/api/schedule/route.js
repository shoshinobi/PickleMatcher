import { NextResponse } from 'next/server';
import { getSchedule, saveSchedule } from '@/lib/sheets';

export async function GET() {
  try {
    const data = await getSchedule();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ schedule: [], stats: {} }, { status: 200 });
  }
}

export async function POST(request) {
  try {
    const { schedule, stats } = await request.json();
    await saveSchedule(schedule, stats);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving schedule:', error);
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
  }
}