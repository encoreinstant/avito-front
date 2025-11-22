import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adsApi, MODERATION_REASONS, type ModerationReason } from '../shared/api/ads';
import type {
  Advertisement,
  ModerationAction,
  AdStatus,
  SortBy,
  SortOrder,
} from '../shared/types';
import { formatDate, formatDateTime, formatPrice } from '../shared/utils/format';

type ActionMode = 'idle' | 'reject' | 'requestChanges';

function StatusBadge({ status }: { status: Advertisement['status'] }) {
  const map: Record<Advertisement['status'], string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
    draft: 'bg-slate-100 text-slate-700',
  };
  const labels: Record<Advertisement['status'], string> = {
    pending: 'На модерации',
    approved: 'Одобрено',
    rejected: 'Отклонено',
    draft: 'Черновик',
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Advertisement['priority'] }) {
  const map: Record<Advertisement['priority'], string> = {
    normal: 'bg-slate-100 text-slate-700',
    urgent: 'bg-indigo-100 text-indigo-800',
  };
  const labels: Record<Advertisement['priority'], string> = {
    normal: 'Обычный',
    urgent: 'Срочный',
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[priority]}`}>
      {labels[priority]}
    </span>
  );
}

function ModerationHistoryList({ history }: { history: Advertisement['moderationHistory'] }) {
  const sorted = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const actionLabels: Record<ModerationAction, string> = {
    approved: 'Одобрено',
    rejected: 'Отклонено',
    requestChanges: 'Вернули на доработку',
  };

  return (
    <div className="space-y-3">
      {sorted.map((entry) => (
        <div
          key={entry.id}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold">{actionLabels[entry.action]}</span>
            <span className="text-xs text-slate-500">{formatDateTime(entry.timestamp)}</span>
          </div>
          <div className="text-xs text-slate-500">Модератор: {entry.moderatorName}</div>
          {entry.reason && <div className="text-sm text-slate-700">Причина: {entry.reason}</div>}
          {entry.comment && (
            <div className="text-sm text-slate-600">Комментарий: {entry.comment}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function imagesWithFallback(images: string[]) {
  if (images.length >= 3) return images;
  const placeholders = Array.from({ length: 3 - images.length }, (_, idx) => {
    const size = 600 + idx * 40;
    return `https://placehold.co/${size}x${size / 1.5}/EEF2FF/334155?text=Фото`;
  });
  return [...images, ...placeholders];
}

function ItemPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const adId = Number(id);
  const backTo = (location.state as { from?: string } | null)?.from ?? '/list';

  const parseFiltersFromBackLink = () => {
    const search = backTo.includes('?') ? backTo.split('?')[1] : '';
    const params = new URLSearchParams(search);
    const filters: {
      search?: string;
      statuses?: AdStatus[];
      categoryId?: number;
      minPrice?: number;
      maxPrice?: number;
      sortBy?: SortBy;
      sortOrder?: SortOrder;
    } = {};

    const statusRaw = params.get('status');
    if (statusRaw) filters.statuses = statusRaw.split(',').filter(Boolean) as AdStatus[];
    const searchValue = params.get('search');
    if (searchValue) filters.search = searchValue;
    const cat = params.get('categoryId');
    if (cat !== null && cat !== '') filters.categoryId = Number(cat);
    const min = params.get('minPrice');
    if (min !== null) filters.minPrice = min ? Number(min) : undefined;
    const max = params.get('maxPrice');
    if (max !== null) filters.maxPrice = max ? Number(max) : undefined;
    const sortBy = params.get('sortBy') as SortBy | null;
    if (sortBy) filters.sortBy = sortBy;
    const sortOrder = params.get('sortOrder') as SortOrder | null;
    if (sortOrder) filters.sortOrder = sortOrder;

    return filters;
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['ad', adId],
    enabled: Number.isFinite(adId),
    queryFn: ({ signal }) => adsApi.get(adId, signal),
  });

  // Загружаем полный список объявлений для навигации (без пагинации)
  const backFilters = useMemo(() => parseFiltersFromBackLink(), [backTo]);

  const allAdsQuery = useQuery({
    queryKey: ['ads', 'navigation', backFilters],
    queryFn: ({ signal }) =>
      adsApi.list(
        {
          page: 1,
          limit: 500,
          search: backFilters.search,
          categoryId: backFilters.categoryId,
          minPrice: backFilters.minPrice,
          maxPrice: backFilters.maxPrice,
          sortBy: backFilters.sortBy ?? 'createdAt',
          sortOrder: backFilters.sortOrder ?? 'desc',
          status: (backFilters.statuses ?? ['pending']).flatMap((s) =>
            s === 'pending' ? ['pending', 'draft'] : [s],
          ),
        },
        signal,
      ),
    staleTime: 5 * 60 * 1000,
  });

  const prevNext = useMemo(() => {
    const ids = allAdsQuery.data?.ads.map((ad) => ad.id) ?? [];
    const index = ids.indexOf(adId);
    return {
      prevId: index > 0 ? ids[index - 1] : null,
      nextId: index >= 0 && index < ids.length - 1 ? ids[index + 1] : null,
    };
  }, [adId, allAdsQuery.data]);

  const [actionMode, setActionMode] = useState<ActionMode>('idle');
  const [reason, setReason] = useState<ModerationReason>(MODERATION_REASONS[0]);
  const [comment, setComment] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ad', adId] });
    queryClient.invalidateQueries({ queryKey: ['ads'] });
  };

  const approveMutation = useMutation({
    mutationFn: () => adsApi.approve(adId),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: () => adsApi.reject(adId, { reason, comment: comment || undefined }),
    onSuccess: () => {
      invalidate();
      setActionMode('idle');
      setComment('');
    },
  });

  const requestChangesMutation = useMutation({
    mutationFn: () => adsApi.requestChanges(adId, { reason, comment: comment || undefined }),
    onSuccess: () => {
      invalidate();
      setActionMode('idle');
      setComment('');
    },
  });

  if (!adId) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        Некорректный идентификатор.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Объявление #{adId}</h1>
          <p className="text-sm text-slate-500">
            Галерея, характеристики, продавец и история модерации.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              prevNext.prevId && navigate(`/item/${prevNext.prevId}`, { state: { from: backTo } })
            }
            disabled={!prevNext.prevId || allAdsQuery.isLoading}
            className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
          >
            ← Предыдущее
          </button>
          <button
            onClick={() => prevNext.nextId && navigate(`/item/${prevNext.nextId}`, { state: { from: backTo } })}
            disabled={!prevNext.nextId || allAdsQuery.isLoading}
            className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
          >
            Следующее →
          </button>
          <Link
            to={backTo}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Назад к списку
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          Загружаем объявление…
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          Не получилось загрузить объявление: {(error as Error).message}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={data.status} />
                    <PriorityBadge priority={data.priority} />
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">{data.title}</h2>
                  <p className="text-sm text-slate-500">
                    Категория: {data.category} · Создано {formatDate(data.createdAt)}
                  </p>
                </div>
                <div className="text-right text-2xl font-bold text-slate-900">
                  {formatPrice(data.price)}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {imagesWithFallback(data.images).map((src, idx) => (
                  <div key={idx} className="overflow-hidden rounded-2xl border border-slate-200">
                    <img src={src} alt={`${data.title} ${idx + 1}`} className="w-full" />
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Описание</h3>
                <p className="mt-2 text-slate-700">{data.description}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Характеристики</h3>
                <div className="mt-3 divide-y divide-slate-100 text-sm text-slate-700">
                  {Object.entries(data.characteristics).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-2">
                      <span className="text-slate-500">{key}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Продавец</h3>
                <p className="mt-2 text-sm text-slate-700">{data.seller.name}</p>
                <p className="text-sm text-slate-500">Рейтинг: {data.seller.rating}</p>
                <p className="text-sm text-slate-500">Объявлений: {data.seller.totalAds}</p>
                <p className="text-sm text-slate-500">
                  На платформе с {formatDate(data.seller.registeredAt)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Действия модератора</h3>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Одобрить
                  </button>
                  <button
                    onClick={() => setActionMode('reject')}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
                  >
                    Отклонить
                  </button>
                  <button
                    onClick={() => setActionMode('requestChanges')}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
                  >
                    Вернуть на доработку
                  </button>
                </div>

                {actionMode !== 'idle' && (
                  <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm font-semibold text-slate-900">
                      {actionMode === 'reject' ? 'Отклонение' : 'Возврат на доработку'}
                    </div>
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
                      value={reason}
                      onChange={(e) => setReason(e.target.value as ModerationReason)}
                    >
                      {MODERATION_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Комментарий (необязательно)"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
                      rows={3}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setActionMode('idle')}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Отменить
                      </button>
                      <button
                        onClick={() =>
                          actionMode === 'reject'
                            ? rejectMutation.mutate()
                            : requestChangesMutation.mutate()
                        }
                        disabled={
                          rejectMutation.isPending ||
                          requestChangesMutation.isPending ||
                          !reason
                        }
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        Отправить
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">История модерации</h3>
                <div className="mt-3">
                  {data.moderationHistory.length ? (
                    <ModerationHistoryList history={data.moderationHistory} />
                  ) : (
                    <p className="text-sm text-slate-500">Пока нет действий.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ItemPage;
