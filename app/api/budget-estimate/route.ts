import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { estimateBudget, EstimateError } from '@/src/lib/claude/estimate';
import { createClient } from '@/src/lib/supabase/server';

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const RequestSchema = z.object({
  destination: z.string().min(1),
  familyProfile: z.object({
    adultCount: z.number().int().min(1).max(10),
    childrenAges: z.array(z.number().int().min(0).max(17)).default([]),
  }),
  season: z.enum(['spring', 'summer', 'autumn', 'winter']),
  style: z.enum(['nature', 'culture', 'resort', 'onsen', 'city']),
  area: z.enum(['domestic', 'overseas']),
  nights: z.number().int().min(1).max(30),
});

// ---------------------------------------------------------------------------
// POST /api/budget-estimate
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'リクエストボディが不正です' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.'));
    return NextResponse.json(
      { error: '条件が不足しています', fields },
      { status: 400 },
    );
  }

  const { destination, familyProfile, season, style, area, nights } = parsed.data;

  try {
    const result = await estimateBudget(destination, familyProfile, season, style, area, nights);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof EstimateError) {
      if (err.code === 'TIMEOUT') {
        return NextResponse.json(
          { error: '見積もりの生成に時間がかかっています。再度お試しください。' },
          { status: 504 },
        );
      }
      if (err.code === 'VALIDATION_ERROR') {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }
    console.error('[POST /api/budget-estimate] unexpected error:', err);
    return NextResponse.json(
      { error: '見積もりの生成に失敗しました' },
      { status: 500 },
    );
  }
}
