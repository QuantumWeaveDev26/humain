import { NextRequest, NextResponse } from 'next/server';
import { getFocusGroupedTasks } from '@/services/task-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timezone = searchParams.get('timezone') || 'Asia/Kolkata';
    const userId = searchParams.get('userId') || 'user-default';

    const grouped = await getFocusGroupedTasks(userId, timezone);
    return NextResponse.json({ success: true, data: grouped });
  } catch (error: any) {
    console.error('API /api/tasks error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
