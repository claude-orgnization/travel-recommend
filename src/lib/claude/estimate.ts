import Anthropic from '@anthropic-ai/sdk';
import type {
  FamilyProfile,
  TripCondition,
  BudgetEstimateResponse,
} from '@/src/types';

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class EstimateError extends Error {
  constructor(
    message: string,
    public readonly code: 'VALIDATION_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'API_ERROR',
  ) {
    super(message);
    this.name = 'EstimateError';
  }
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const SEASON_LABELS: Record<TripCondition['season'], string> = {
  spring: '春（3〜5月）',
  summer: '夏（6〜8月）',
  autumn: '秋（9〜11月）',
  winter: '冬（12〜2月）',
};

const STYLE_LABELS: Record<TripCondition['style'], string> = {
  nature: '自然体験',
  culture: '文化・歴史',
  resort: 'リゾート',
  onsen: '温泉・のんびり',
  city: '都市観光',
};

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildEstimatePrompt(
  destination: string,
  profile: FamilyProfile,
  season: TripCondition['season'],
  style: TripCondition['style'],
  area: TripCondition['area'],
  nights: number,
): string {
  const childrenDesc =
    profile.childrenAges.length > 0
      ? `子供 ${profile.childrenAges.length} 名（年齢: ${profile.childrenAges.join(', ')} 歳）`
      : '子供なし';

  return `あなたは旅行の費用見積もりの専門家です。
以下の条件で旅行した場合の費用を、カテゴリ別に見積もってください。

## 旅行先
${destination}

## 家族構成
- 大人: ${profile.adultCount} 名
- ${childrenDesc}

## 旅行条件
- 時期: ${SEASON_LABELS[season]}
- スタイル: ${STYLE_LABELS[style]}
- エリア: ${area === 'domestic' ? '国内' : '海外'}
- 宿泊数: ${nights} 泊

## 出力形式
以下の JSON のみを返してください（コードブロック不要）:
{
  "totalMin": 最小合計額（数値・円）,
  "totalMax": 最大合計額（数値・円）,
  "categories": [
    {
      "category": "交通費",
      "estimatedMin": 最小（数値・円）,
      "estimatedMax": 最大（数値・円）,
      "note": "補足（例: 新幹線利用の場合）"
    },
    {
      "category": "宿泊費",
      "estimatedMin": 最小,
      "estimatedMax": 最大,
      "note": "補足"
    },
    {
      "category": "食費",
      "estimatedMin": 最小,
      "estimatedMax": 最大,
      "note": "補足"
    },
    {
      "category": "アクティビティ・観光",
      "estimatedMin": 最小,
      "estimatedMax": 最大,
      "note": "補足"
    },
    {
      "category": "その他（お土産・雑費）",
      "estimatedMin": 最小,
      "estimatedMax": 最大,
      "note": "補足"
    }
  ],
  "advice": "費用を抑えるためのアドバイス（2〜3文）"
}

## 注意
- 費用は家族全員分の合計
- 現実的で具体的な金額を示すこと
- totalMin/totalMax は categories の合計と一致させること
- JSON 以外のテキストを含めないこと`;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 28_000;

export async function estimateBudget(
  destination: string,
  profile: FamilyProfile,
  season: TripCondition['season'],
  style: TripCondition['style'],
  area: TripCondition['area'],
  nights: number,
): Promise<BudgetEstimateResponse> {
  if (nights < 1 || nights > 30) {
    throw new EstimateError('宿泊数は1〜30の範囲で指定してください', 'VALIDATION_ERROR');
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let rawText: string;

  try {
    const message = await client.messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: buildEstimatePrompt(destination, profile, season, style, area, nights),
          },
        ],
      },
      { signal: controller.signal },
    );

    rawText =
      message.content[0]?.type === 'text' ? message.content[0].text : '';
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.name === 'AbortError' || err.message.includes('aborted'))
    ) {
      throw new EstimateError('見積もりの生成がタイムアウトしました', 'TIMEOUT');
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new EstimateError(`Claude API エラー: ${msg}`, 'API_ERROR');
  } finally {
    clearTimeout(timer);
  }

  let parsed: BudgetEstimateResponse;
  try {
    const json = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    parsed = JSON.parse(json);
  } catch {
    throw new EstimateError(
      `レスポンスが JSON として解析できませんでした: ${rawText.slice(0, 200)}`,
      'INVALID_RESPONSE',
    );
  }

  if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
    throw new EstimateError(
      'レスポンスに categories が含まれていません',
      'INVALID_RESPONSE',
    );
  }

  return parsed;
}
