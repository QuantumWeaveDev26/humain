import { NextRequest, NextResponse } from 'next/server';
import { undoAiAction } from '@/services/ai-action-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { aiActionId, userId } = body;

    if (!aiActionId) {
      return NextResponse.json(
        { success: false, message: 'AI Action ID is required' },
        { status: 400 }
      );
    }

    const result = await undoAiAction(aiActionId, userId || 'user-default');
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API /api/assistant/undo error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
