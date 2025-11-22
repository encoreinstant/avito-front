import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { adsApi } from '../shared/api/ads';
import type { AdStatus, AdsListResponse, Priority, SortBy, SortOrder } from '../shared/types';
import { formatDate, formatPrice } from '../shared/utils/format';

type Filters = {
  search: string;
  statuses: AdStatus[];
  categoryId?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  sortBy: SortBy;
  sortOrder: SortOrder;
  page: number;
  limit: number;
};

const statusOptions: { value: AdStatus; label: string }[] = [
  { value: 'pending', label: 'На модерации' },
  { value: 'approved', label: 'Одобрено' },
  { value: 'rejected', label: 'Отклонено' },
  { value: 'draft', label: 'Черновик' },
];

const priorityLabel: Record<Priority, string> = {
  normal: 'Обычный',
  urgent: 'Срочный',
};

function StatusBadge({ status }: { status: AdStatus }) {
  const map: Record<AdStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
    draft: 'bg-slate-100 text-slate-700',
  };

  const labels: Record<AdStatus, string> = {
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

function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, string> = {
    normal: 'bg-slate-100 text-slate-700',
    urgent: 'bg-indigo-100 text-indigo-800',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[priority]}`}>
      {priorityLabel[priority]}
    </span>
  );
}

function FiltersPanel({
  filters,
  onChange,
  onReset,
  categoryOptions,
}: {
  filters: Filters;
  onChange: (next: Partial<Filters>) => void;
  onReset: () => void;
  categoryOptions: { id: number; label: string }[];
}) {
  const toggleStatus = (value: AdStatus) => {
    const exists = filters.statuses.includes(value);
    const next = exists
      ? filters.statuses.filter((s) => s !== value)
      : [...filters.statuses, value];
    onChange({ statuses: next, page: 1 });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Поиск по названию"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
            className="w-64 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-amber-200 focus:border-amber-300 focus:ring-2"
          />
          <select
            className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none ring-amber-200 focus:border-amber-300 focus:ring-2"
            value={filters.categoryId ?? ''}
            onChange={(e) =>
              onChange({
                categoryId: e.target.value ? Number(e.target.value) : null,
                page: 1,
              })
            }
          >
            <option value="">Все категории</option>
            {categoryOptions.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <label className="text-xs uppercase tracking-wide text-slate-500">Цена</label>
            <input
              type="number"
              placeholder="от"
              value={filters.minPrice ?? ''}
              onChange={(e) =>
                onChange({
                  minPrice: e.target.value ? Number(e.target.value) : null,
                  page: 1,
                })
              }
              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
            />
            <input
              type="number"
              placeholder="до"
              value={filters.maxPrice ?? ''}
              onChange={(e) =>
                onChange({
                  maxPrice: e.target.value ? Number(e.target.value) : null,
                  page: 1,
                })
              }
              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none ring-amber-200 focus:border-amber-300 focus:ring-2"
            value={`${filters.sortBy}:${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split(':') as [SortBy, SortOrder];
              onChange({ sortBy, sortOrder, page: 1 });
            }}
          >
            <option value="createdAt:desc">Сначала новые</option>
            <option value="createdAt:asc">Сначала старые</option>
            <option value="price:asc">Цена: по возрастанию</option>
            <option value="price:desc">Цена: по убыванию</option>
            <option value="priority:desc">Сначала срочные</option>
          </select>

          <button
            onClick={onReset}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Сбросить
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {statusOptions.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:border-amber-200"
          >
            <input
              type="checkbox"
              className="accent-blue-600"
              checked={filters.statuses.includes(option.value)}
              onChange={() => toggleStatus(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function Pagination({
  pagination,
  onChange,
}: {
  pagination: AdsListResponse['pagination'];
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <div>
        Всего: <span className="font-semibold text-slate-900">{pagination.totalItems}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-700 disabled:opacity-40"
          onClick={() => onChange(pagination.currentPage - 1)}
          disabled={pagination.currentPage <= 1}
        >
          ← Назад
        </button>
        <span>
          Страница {pagination.currentPage} / {pagination.totalPages}
        </span>
        <button
          className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-700 disabled:opacity-40"
          onClick={() => onChange(pagination.currentPage + 1)}
          disabled={pagination.currentPage >= pagination.totalPages}
        >
          Вперёд →
        </button>
      </div>
    </div>
  );
}

function ListPage() {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    statuses: ['pending'],
    categoryId: null,
    minPrice: null,
    maxPrice: null,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10,
  });

  const { data, isLoading, isError, error } = useQuery<AdsListResponse>({
    queryKey: ['ads', filters],
    queryFn: ({ signal }) =>
      adsApi.list(
        {
          page: filters.page,
          limit: filters.limit,
          search: filters.search || undefined,
          status: filters.statuses,
          categoryId: filters.categoryId ?? undefined,
          minPrice: filters.minPrice ?? undefined,
          maxPrice: filters.maxPrice ?? undefined,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        },
        signal,
      ),
    placeholderData: keepPreviousData,
  });

  const categoryOptions = useMemo(() => {
    if (!data?.ads) return [];
    const set = new Map<number, string>();
    data?.ads.forEach((ad) => {
      if (!set.has(ad.categoryId)) set.set(ad.categoryId, ad.category);
    });
    return Array.from(set.entries()).map(([id, label]) => ({ id, label }));
  }, [data]);

  const handleChange = (next: Partial<Filters>) =>
    setFilters((prev) => ({ ...prev, ...next }));

  const handleReset = () =>
    setFilters({
      search: '',
      statuses: ['pending'],
      categoryId: null,
      minPrice: null,
      maxPrice: null,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 10,
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Список объявлений</h1>
          <p className="text-sm text-slate-500">
            Фильтруйте по статусу, категории, цене, а также сортируйте и переходите по страницам.
          </p>
        </div>
      </div>

      <FiltersPanel
        filters={filters}
        onChange={handleChange}
        onReset={handleReset}
        categoryOptions={categoryOptions}
      />

      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          Загружаем данные…
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          Не удалось загрузить объявления: {(error as Error).message}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {data.ads.map((ad) => (
              <Link
                key={ad.id}
                to={`/item/${ad.id}`}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-48 bg-slate-100">
                  <img
                    src={ad.images?.[0] || 'https://placehold.co/600x400/EEF2FF/334155?text=Нет+фото'}
                    alt={ad.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-3 top-3 flex gap-2">
                    <StatusBadge status={ad.status} />
                    <PriorityBadge priority={ad.priority} />
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{ad.title}</h3>
                      <p className="text-sm text-slate-500">{ad.category}</p>
                    </div>
                    <div className="text-right text-base font-semibold text-slate-900">
                      {formatPrice(ad.price)}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    {ad.description.length > 140
                      ? `${ad.description.slice(0, 140)}…`
                      : ad.description}
                  </p>
                  <div className="mt-auto flex items-center justify-between text-xs text-slate-500">
                    <span>Создано: {formatDate(ad.createdAt)}</span>
                    <span>ID {ad.id}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Pagination pagination={data.pagination} onChange={(page) => handleChange({ page })} />
        </div>
      )}
    </div>
  );
}

export default ListPage;
