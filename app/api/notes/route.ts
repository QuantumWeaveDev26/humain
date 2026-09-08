import { NextRequest, NextResponse } from 'next/server';
import { getGeneralNotes, addGeneralNote } from '@/services/note-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'user-default';

    const notes = await getGeneralNotes(userId);
    return NextResponse.json({ success: true, data: notes });
  } catch (error: any) {
    console.error('API /api/notes GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, userId = 'user-default' } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ success: false, error: 'content is required' }, { status: 400 });
    }

    const note = await addGeneralNote(content, userId);
    return NextResponse.json({ success: true, data: note });
  } catch (error: any) {
    console.error('API /api/notes POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
