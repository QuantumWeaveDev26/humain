import { NextRequest, NextResponse } from 'next/server';
import { searchLead, createLead } from '@/services/lead-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const userId = searchParams.get('userId') || 'user-default';

    const leads = await searchLead(query || 'a', userId);
    return NextResponse.json({ success: true, data: leads });
  } catch (error: any) {
    console.error('API /api/leads error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, company, notes, userId } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const lead = await createLead({ name, phone, email, company, notes }, userId || 'user-default');
    return NextResponse.json({ success: true, data: lead });
  } catch (error: any) {
    console.error('API /api/leads POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
