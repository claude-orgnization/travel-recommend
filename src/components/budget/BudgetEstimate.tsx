'use client';

import { useState } from 'react';
import type {
  Destination,
  BudgetEstimateResponse,
  BudgetEstimateRequest,
} from '@/src/types';

// ---------------------------------------------------------------------------
// Category colors
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  '交通費': 'bg-blue-500',
  '宿泊費': 'bg-amber-500',
  '食費': 'bg-green-500',
  'アクティビティ・観光': 'bg-purple-500',
  'その他（お土産・雑費）': 'bg-gray-400',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? 'bg-gray-400';
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatYen(amount: number): string {
  if (amount >= 10000) {
    const man = Math.round(amount / 1000) / 10;
    return `${man}万円`;
  }
  return `${amount.toLocaleString('ja-JP')}円`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  destination: Destination;
}

export default function BudgetEstimate({ destination }: Props) {
  const [nights, setNights] = useState(2);
  const [adultCount, setAdultCount] = useState(2);
  const [childrenAgesText, setChildrenAgesText] = useState('');
  const [season, setSeason] = useState<BudgetEstimateRequest['season']>('spring');
  const [style, setStyle] = useState<BudgetEstimateRequest['style']>('nature');
  const [area, setArea] = useState<BudgetEstimateRequest['area']>('domestic');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BudgetEstimateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  async function handleEstimate() {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const childrenAges = childrenAgesText
      .split(/[,、\s]+/)
      .map((str: string) => parseInt(str, 10))
      .filter((num: number) => !isNaN(num) && num >= 0 && num <= 17);

    try {
      const res = await fetch('/api/budget-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: destination.name,
          familyProfile: { adultCount, childrenAges },
          season,
          style,
          area,
          nights,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '見積もりに失敗しました');
      }

      const data: BudgetEstimateResponse = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '見積もりに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section aria-label="予算見積もり" className="border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--color-neutral-50)] transition-colors"
      >
        <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
          <span aria-hidden="true" className="text-base">&#128176;</span>
          予算を詳しく見積もる
        </h2>
        <span className="text-xs text-[var(--color-neutral-500)]">
          {isOpen ? '閉じる' : '開く'}
        </span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--border)]">
          {/* Input form */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <div>
              <label htmlFor="est-nights" className="block text-xs font-medium text-[var(--color-neutral-700)] mb-1">
                宿泊数
              </label>
              <input
                id="est-nights"
                type="number"
                min={1}
                max={30}
                value={nights}
                onChange={(e) => setNights(parseInt(e.target.value, 10) || 1)}
                className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
              />
            </div>
            <div>
              <label htmlFor="est-adults" className="block text-xs font-medium text-[var(--color-neutral-700)] mb-1">
                大人人数
              </label>
              <input
                id="est-adults"
                type="number"
                min={1}
                max={10}
                value={adultCount}
                onChange={(e) => setAdultCount(parseInt(e.target.value, 10) || 1)}
                className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
              />
            </div>
            <div>
              <label htmlFor="est-children" className="block text-xs font-medium text-[var(--color-neutral-700)] mb-1">
                子供の年齢（カンマ区切り）
              </label>
              <input
                id="est-children"
                type="text"
                placeholder="例: 5, 10"
                value={childrenAgesText}
                onChange={(e) => setChildrenAgesText(e.target.value)}
                className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
              />
            </div>
            <div>
              <label htmlFor="est-season" className="block text-xs font-medium text-[var(--color-neutral-700)] mb-1">
                時期
              </label>
              <select
                id="est-season"
                value={season}
                onChange={(e) => setSeason(e.target.value as BudgetEstimateRequest['season'])}
                className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
              >
                <option value="spring">春</option>
                <option value="summer">夏</option>
                <option value="autumn">秋</option>
                <option value="winter">冬</option>
              </select>
            </div>
            <div>
              <label htmlFor="est-style" className="block text-xs font-medium text-[var(--color-neutral-700)] mb-1">
                スタイル
              </label>
              <select
                id="est-style"
                value={style}
                onChange={(e) => setStyle(e.target.value as BudgetEstimateRequest['style'])}
                className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
              >
                <option value="nature">自然体験</option>
                <option value="culture">文化・歴史</option>
                <option value="resort">リゾート</option>
                <option value="onsen">温泉・のんびり</option>
                <option value="city">都市観光</option>
              </select>
            </div>
            <div>
              <label htmlFor="est-area" className="block text-xs font-medium text-[var(--color-neutral-700)] mb-1">
                エリア
              </label>
              <select
                id="est-area"
                value={area}
                onChange={(e) => setArea(e.target.value as BudgetEstimateRequest['area'])}
                className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
              >
                <option value="domestic">国内</option>
                <option value="overseas">海外</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleEstimate}
            disabled={isLoading}
            className="w-full py-2.5 bg-[var(--color-primary-600)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-primary-700)] disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'AIが見積もり中...' : '見積もりを取得'}
          </button>

          {/* Error */}
          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4 pt-2">
              {/* Total */}
              <div className="text-center p-4 bg-[var(--color-primary-50)] rounded-xl border border-[var(--color-primary-100)]">
                <p className="text-xs text-[var(--color-neutral-700)] mb-1">家族全員の合計見積もり</p>
                <p className="text-xl font-bold text-[var(--color-primary-700)]">
                  {formatYen(result.totalMin)} 〜 {formatYen(result.totalMax)}
                </p>
              </div>

              {/* Category breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-700)]">
                  カテゴリ別内訳
                </h3>
                {result.categories.map((cat) => {
                  const maxBudget = Math.max(...result.categories.map((c) => c.estimatedMax));
                  const barWidth = maxBudget > 0 ? (cat.estimatedMax / maxBudget) * 100 : 0;

                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-medium text-[var(--foreground)]">
                          {cat.category}
                        </span>
                        <span className="text-sm text-[var(--color-neutral-700)]">
                          {formatYen(cat.estimatedMin)} 〜 {formatYen(cat.estimatedMax)}
                        </span>
                      </div>
                      <div className="h-3 bg-[var(--color-neutral-100)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getCategoryColor(cat.category)} transition-all duration-500`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <p className="text-xs text-[var(--color-neutral-500)]">{cat.note}</p>
                    </div>
                  );
                })}
              </div>

              {/* Advice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-700 mb-1">節約のコツ</p>
                <p className="text-sm text-amber-800">{result.advice}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
