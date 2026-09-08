import { NextRequest, NextResponse } from 'next/server';
import { getPendingReminders, markReminderSent } from '@/services/reminder-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'user-default';

    const reminders = await getPendingReminders(userId);
    return NextResponse.json({ success: true, data: reminders });
  } catch (error: any) {
    console.error('API /api/reminders/poll error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reminderId } = body;

    if (!reminderId) {
      return NextResponse.json({ success: false, error: 'reminderId is required' }, { status: 400 });
    }

    const updated = await markReminderSent(reminderId);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('API /api/reminders/poll POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
