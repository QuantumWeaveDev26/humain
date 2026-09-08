import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/services/audit-service';
import { getRecentAiActions } from '@/services/ai-action-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'user-default';

    const [auditLogs, aiActions] = await Promise.all([
      getAuditLogs(userId, 20),
      getRecentAiActions(userId, 20),
    ]);

    return NextResponse.json({ success: true, auditLogs, aiActions });
  } catch (error: any) {
    console.error('API /api/audit error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
