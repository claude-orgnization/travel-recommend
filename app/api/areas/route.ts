import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';

/**
 * GET /api/areas
 * 楽天トラベル GetAreaClass API から地区コード一覧を取得し、
 * フロントエンドのドロップダウンで利用できる形式に変換して返す。
 */

const GET_AREA_CLASS_URL =
  'https://openapi.rakuten.co.jp/engine/api/Travel/GetAreaClass/20140210';

interface SubArea {
  label: string;
  smallClassCode: string;
}

interface PrefectureData {
  label: string;
  middleClassCode: string;
  subAreas: SubArea[];
}

export async function GET() {
  // Auth check
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const applicationId = process.env.RAKUTEN_APPLICATION_ID?.trim();
  const accessKey = process.env.RAKUTEN_ACCESS_KEY?.trim();

  if (!applicationId || !accessKey) {
    return NextResponse.json({ error: 'API設定が不足しています' }, { status: 503 });
  }

  const params = new URLSearchParams({ applicationId, accessKey, format: 'json' });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://travel-recommend-2-33ttmo5ff-ogata-kazuyoshis-projects.vercel.app';

  try {
    const response = await fetch(`${GET_AREA_CLASS_URL}?${params.toString()}`, {
      headers: {
        Origin: appUrl,
        Referer: `${appUrl}/`,
      },
      next: { revalidate: 86400 }, // 24時間キャッシュ
    });

    if (!response.ok) {
      console.error('[GET /api/areas] Rakuten API error:', response.status);
      return NextResponse.json({ error: '地区コード取得に失敗しました' }, { status: 502 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();

    const prefectures: PrefectureData[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const largeClasses = data?.areaClasses?.largeClasses ?? [];
    for (const lc of largeClasses) {
      const middleClasses = lc?.largeClass?.[1]?.middleClasses ?? [];
      for (const mc of middleClasses) {
        const middleArr = mc?.middleClass ?? [];
        const middleInfo = middleArr[0] ?? {};
        const middleClassCode = middleInfo.middleClassCode;
        const middleClassName = middleInfo.middleClassName;

        if (!middleClassCode) continue;

        const subAreas: SubArea[] = [];
        const smallClasses = middleArr[1]?.smallClasses ?? [];
        for (const sc of smallClasses) {
          const smallArr = sc?.smallClass ?? [];
          const smallInfo = smallArr[0] ?? {};
          if (smallInfo.smallClassCode) {
            subAreas.push({
              label: smallInfo.smallClassName ?? smallInfo.smallClassCode,
              smallClassCode: smallInfo.smallClassCode,
            });
          }
        }

        if (subAreas.length > 0) {
          prefectures.push({
            label: middleClassName ?? middleClassCode,
            middleClassCode,
            subAreas,
          });
        }
      }
    }

    return NextResponse.json({ prefectures }, { status: 200 });
  } catch (err: unknown) {
    console.error('[GET /api/areas] error:', err);
    return NextResponse.json({ error: '地区コード取得に失敗しました' }, { status: 500 });
  }
}
