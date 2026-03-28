'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import type { SavedProposal } from '@/src/types';
import BudgetEstimate from '@/src/components/budget/BudgetEstimate';

interface Props {
  params: Promise<{ id: string }>;
}

export default function SavedDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  const [saved, setSaved] = useState<SavedProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [memo, setMemo] = useState('');
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [memoStatus, setMemoStatus] = useState<string | null>(null);
  const [isDeciding, setIsDeciding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/saved/${id}`);
        if (!res.ok) throw new Error('取得に失敗しました');
        const data: SavedProposal = await res.json();
        setSaved(data);
        setMemo(data.memo);
      } catch {
        setError('旅行先の情報を取得できませんでした');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSaveMemo() {
    setIsSavingMemo(true);
    setMemoStatus(null);
    try {
      const res = await fetch(`/api/saved/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo }),
      });
      if (!res.ok) throw new Error();
      setMemoStatus('保存しました');
    } catch {
      setMemoStatus('保存に失敗しました');
    } finally {
      setIsSavingMemo(false);
    }
  }

  async function handleDecide() {
    if (!saved || saved.isDecided) return;
    setIsDeciding(true);
    try {
      const res = await fetch(`/api/saved/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDecided: true }),
      });
      if (!res.ok) throw new Error();

      // Create itinerary
      const itRes = await fetch('/api/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savedProposalId: id }),
      });
      if (!itRes.ok) throw new Error('しおり生成に失敗しました');
      const itData: { id: string } = await itRes.json();
      router.push(`/itinerary/${itData.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'エラーが発生しました';
      setError(msg);
      setIsDeciding(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/saved/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.push('/dashboard');
    } catch {
      setError('削除に失敗しました');
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div role="status" aria-label="読み込み中" className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !saved) {
    return (
      <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        {error ?? '旅行先の情報が見つかりませんでした'}
      </div>
    );
  }

  const dest = saved.destination;

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{dest.name}</h1>
          <p className="text-sm text-[var(--color-primary-600)] font-medium mt-1">
            {dest.estimatedBudget}
          </p>
        </div>
        {saved.isDecided && (
          <span className="shrink-0 text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200">
            決定済み
          </span>
        )}
      </header>

      <section aria-label="旅行先の詳細">
        <p className="text-sm text-[var(--color-neutral-700)] leading-relaxed mb-4">
          {dest.overview}
        </p>

        <div className="mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-700)] mb-2">
            見どころ
          </h2>
          <ul className="flex flex-wrap gap-2">
            {dest.highlights.map((h) => (
              <li
                key={h}
                className="text-xs bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-2 py-0.5 rounded-full border border-[var(--color-primary-100)]"
              >
                {h}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs italic text-[var(--color-neutral-700)]">{dest.tips}</p>
      </section>

      {/* Budget estimate section */}
      <BudgetEstimate destination={dest} />

      {/* Memo section */}
      <section aria-label="メモ" className="border border-[var(--border)] rounded-xl p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">メモ</h2>
        <label htmlFor="memo" className="sr-only">
          メモ
        </label>
        <textarea
          id="memo"
          aria-label="メモ"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={4}
          placeholder="家族のコメントや気になる点などを記録..."
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
        />
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={handleSaveMemo}
            disabled={isSavingMemo}
            className="px-4 py-1.5 bg-[var(--color-primary-600)] text-white text-sm rounded-lg hover:bg-[var(--color-primary-700)] disabled:opacity-50 transition-colors"
          >
            {isSavingMemo ? '保存中...' : 'メモを保存'}
          </button>
          {memoStatus && (
            <p role="status" aria-live="polite" className="text-xs text-[var(--color-neutral-700)]">
              {memoStatus}
            </p>
          )}
        </div>
      </section>

      {/* Actions */}
      <section aria-label="アクション" className="flex flex-col sm:flex-row gap-3">
        {!saved.isDecided && (
          <button
            onClick={handleDecide}
            disabled={isDeciding}
            className="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isDeciding ? 'しおりを作成中...' : 'この旅行先に決めた'}
          </button>
        )}

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex-1 sm:flex-none py-3 px-6 border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
          aria-label="この提案を削除"
        >
          この提案を削除
        </button>
      </section>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 flex items-center justify-center bg-black/40 z-50"
        >
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 id="delete-dialog-title" className="font-bold text-[var(--foreground)] mb-2">
              提案を削除しますか？
            </h3>
            <p className="text-sm text-[var(--color-neutral-700)] mb-4">
              「{dest.name}」を保存済み一覧から削除します。この操作は元に戻せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--color-neutral-100)] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
