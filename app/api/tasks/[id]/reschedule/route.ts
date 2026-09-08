import { NextRequest, NextResponse } from 'next/server';
import { rescheduleFollowUp } from '@/services/task-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { newDueAt, newReminderAt, userId } = body;

    if (!newDueAt) {
      return NextResponse.json({ success: false, error: 'newDueAt is required' }, { status: 400 });
    }

    const result = await rescheduleFollowUp(id, newDueAt, newReminderAt, userId || 'user-default');
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('API /api/tasks/[id]/reschedule error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
