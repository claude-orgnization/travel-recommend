'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Destination } from '@/src/types';
import type { HotelSearchResult } from '@/src/lib/rakuten/hotels';
import { getAreaCode, PREFECTURE_AREAS } from '@/src/lib/rakuten/areaCodeMap';
import type { SubArea, PrefectureArea } from '@/src/lib/rakuten/areaCodeMap';
import { HotelCard } from './HotelCard';

interface HotelSearchSectionProps {
  destinations: Destination[];
  adultNum: number;
  childrenCount: number;
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getTomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// 地方でグルーピングした選択肢を生成
const REGION_ORDER = ['北海道', '東北', '関東', '甲信越', '北陸', '東海', '近畿', '中国', '四国', '九州', '沖縄'];

// 都道府県 → 地方のマッピング
const PREF_REGION_MAP: Record<string, string> = {};
for (const p of PREFECTURE_AREAS) {
  PREF_REGION_MAP[p.middleClassCode] = p.region;
}

interface ApiPrefecture {
  label: string;
  middleClassCode: string;
  subAreas: SubArea[];
}

export function HotelSearchSection({
  destinations,
  adultNum,
  childrenCount,
}: HotelSearchSectionProps) {
  const [selectedDestIndex, setSelectedDestIndex] = useState<number>(0);
  const [middleClassCode, setMiddleClassCode] = useState<string>('');
  const [smallClassCode, setSmallClassCode] = useState<string>('');
  const [checkinDate, setCheckinDate] = useState<string>(getTodayStr());
  const [checkoutDate, setCheckoutDate] = useState<string>(getTomorrowStr());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HotelSearchResult | null>(null);
  const [searched, setSearched] = useState(false);

  // APIから取得した地区コードデータ（取得できなければハードコードを使用）
  const [apiAreas, setApiAreas] = useState<PrefectureArea[] | null>(null);

  // 地区コードをAPIから取得
  useEffect(() => {
    fetch('/api/areas')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.prefectures?.length > 0) {
          // APIデータに region を付与
          const enriched: PrefectureArea[] = data.prefectures.map((p: ApiPrefecture) => ({
            ...p,
            region: PREF_REGION_MAP[p.middleClassCode] ?? '他',
          }));
          setApiAreas(enriched);
        }
      })
      .catch(() => {
        // フォールバック: ハードコードのデータを使用
      });
  }, []);

  const prefectureAreas = apiAreas ?? PREFECTURE_AREAS;

  // 選択中の都道府県に対応するサブエリア一覧
  const subAreas: SubArea[] = useMemo(() => {
    if (!middleClassCode) return [];
    const pref = prefectureAreas.find((p) => p.middleClassCode === middleClassCode);
    return pref?.subAreas ?? [];
  }, [middleClassCode, prefectureAreas]);

  // 目的地が変わったらエリアコードを自動推定
  useEffect(() => {
    const dest = destinations[selectedDestIndex];
    if (dest) {
      const detected = getAreaCode(dest.name);
      if (detected) {
        setMiddleClassCode(detected.middleClassCode);
        setSmallClassCode(detected.smallClassCode);
      } else {
        setMiddleClassCode('');
        setSmallClassCode('');
      }
    }
  }, [selectedDestIndex, destinations]);

  // 都道府県が変わったらサブエリアをリセット
  const handlePrefChange = useCallback((newMiddle: string) => {
    setMiddleClassCode(newMiddle);
    const pref = prefectureAreas.find((p) => p.middleClassCode === newMiddle);
    setSmallClassCode(pref?.subAreas[0]?.smallClassCode ?? '');
  }, [prefectureAreas]);

  async function handleSearch() {
    if (!middleClassCode || !smallClassCode) {
      setError('都道府県とエリアを選択してください');
      return;
    }
    if (!checkinDate || !checkoutDate) {
      setError('チェックイン・チェックアウト日を入力してください');
      return;
    }
    if (checkinDate >= checkoutDate) {
      setError('チェックアウト日はチェックイン日より後にしてください');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setSearched(false);

    try {
      const params = new URLSearchParams({
        middleClassCode,
        smallClassCode,
        checkinDate,
        checkoutDate,
        adultNum: String(adultNum),
        upClassNum: String(childrenCount),
        hits: '9',
      });

      const response = await fetch(`/api/hotels?${params.toString()}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'ホテル検索に失敗しました');
      }

      const data: HotelSearchResult = await response.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ホテル検索に失敗しました');
    } finally {
      setIsLoading(false);
      setSearched(true);
    }
  }

  // 地方ごとにグルーピングされた選択肢
  const regionGroups = useMemo(() => {
    const allRegions = [...new Set(prefectureAreas.map((p) => p.region))];
    // REGION_ORDERの順に並べ、含まれないものは末尾に
    const ordered = REGION_ORDER.filter((r) => allRegions.includes(r));
    const extra = allRegions.filter((r) => !REGION_ORDER.includes(r));
    return [...ordered, ...extra];
  }, [prefectureAreas]);

  return (
    <section aria-label="ホテル検索" className="space-y-4">
      <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">
        ホテルを検索する
      </h2>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        {/* 目的地選択 */}
        <div>
          <label htmlFor="hotel-destination" className="block text-sm font-medium mb-1">
            旅行先候補
          </label>
          <select
            id="hotel-destination"
            value={selectedDestIndex}
            onChange={(e) => setSelectedDestIndex(Number(e.target.value))}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
          >
            {destinations.map((dest, i) => (
              <option key={dest.name} value={i}>
                {dest.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 都道府県 */}
          <div>
            <label htmlFor="hotel-pref" className="block text-sm font-medium mb-1">
              都道府県 <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <select
              id="hotel-pref"
              value={middleClassCode}
              onChange={(e) => handlePrefChange(e.target.value)}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
            >
              <option value="">都道府県を選択</option>
              {regionGroups.map((region) => (
                <optgroup key={region} label={region}>
                  {prefectureAreas.filter((p) => p.region === region).map((p) => (
                    <option key={p.middleClassCode} value={p.middleClassCode}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {middleClassCode === '' && (
              <p className="mt-1 text-xs text-[var(--color-neutral-700)]">
                自動判別できませんでした。都道府県を選択してください。
              </p>
            )}
          </div>

          {/* エリア (smallClassCode) */}
          <div>
            <label htmlFor="hotel-area" className="block text-sm font-medium mb-1">
              エリア <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <select
              id="hotel-area"
              value={smallClassCode}
              onChange={(e) => setSmallClassCode(e.target.value)}
              disabled={subAreas.length === 0}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] disabled:opacity-50"
            >
              <option value="">エリアを選択</option>
              {subAreas.map((sa) => (
                <option key={sa.smallClassCode} value={sa.smallClassCode}>
                  {sa.label}
                </option>
              ))}
            </select>
          </div>

          {/* チェックイン */}
          <div>
            <label htmlFor="hotel-checkin" className="block text-sm font-medium mb-1">
              チェックイン <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="hotel-checkin"
              type="date"
              value={checkinDate}
              min={getTodayStr()}
              onChange={(e) => setCheckinDate(e.target.value)}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
            />
          </div>

          {/* チェックアウト */}
          <div>
            <label htmlFor="hotel-checkout" className="block text-sm font-medium mb-1">
              チェックアウト <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="hotel-checkout"
              type="date"
              value={checkoutDate}
              min={checkinDate || getTodayStr()}
              onChange={(e) => setCheckoutDate(e.target.value)}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          onClick={handleSearch}
          disabled={isLoading}
          aria-disabled={isLoading}
          className="px-6 py-2.5 bg-[var(--color-primary-600)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-primary-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '検索中...' : 'ホテルを検索'}
        </button>
      </div>

      {/* ローディング */}
      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          aria-label="ホテルを検索中"
          className="flex items-center gap-3 py-6 text-[var(--color-neutral-700)]"
        >
          <div
            aria-hidden="true"
            className="w-6 h-6 border-3 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)] rounded-full animate-spin"
          />
          <p className="text-sm">ホテルを検索しています...</p>
        </div>
      )}

      {/* 検索結果 */}
      {!isLoading && searched && result && (
        <>
          {result.hotels.length === 0 ? (
            <p className="text-sm text-[var(--color-neutral-700)] py-4">
              条件に合うホテルが見つかりませんでした。日程やエリアを変えてお試しください。
            </p>
          ) : (
            <div>
              <p className="text-sm text-[var(--color-neutral-700)] mb-3">
                {result.totalCount} 件中 {result.hotels.length} 件を表示
              </p>
              <ul
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                role="list"
                aria-label="ホテル検索結果"
              >
                {result.hotels.map((hotel) => (
                  <li key={hotel.hotelInformationUrl} role="listitem">
                    <HotelCard hotel={hotel} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
