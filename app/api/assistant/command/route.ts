import { NextRequest, NextResponse } from 'next/server';
import { executeAssistantCommand } from '@/ai/orchestrator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { commandText, userTimezone, referenceTime, userId } = body;

    if (!commandText || typeof commandText !== 'string' || !commandText.trim()) {
      return NextResponse.json(
        { success: false, error: 'Command text is required' },
        { status: 400 }
      );
    }

    const result = await executeAssistantCommand({
      commandText: commandText.trim(),
      userTimezone: userTimezone || 'Asia/Kolkata',
      referenceTime: referenceTime || new Date().toISOString(),
      userId: userId || 'user-default',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API /api/assistant/command error:', error);
    return NextResponse.json(
      {
        success: false,
        confirmationMessage: `An error occurred while processing your command: ${error.message}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
