import { NextRequest, NextResponse } from 'next/server';
import { completeFollowUp } from '@/services/task-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { notes, userId } = body;

    const task = await completeFollowUp(id, notes, userId || 'user-default');
    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    console.error('API /api/tasks/[id]/complete error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
