import { NextRequest, NextResponse } from 'next/server';
import { getLeadHistory, getLeadById } from '@/services/lead-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'user-default';

    const lead = await getLeadById(id);
    const history = await getLeadHistory(id, userId);

    return NextResponse.json({ success: true, lead, data: history });
  } catch (error: any) {
    console.error('API /api/leads/[id]/history error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
