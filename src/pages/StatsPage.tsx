import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../shared/api/stats';
import type { ActivityData, DecisionsData, Period, StatsSummary } from '../shared/types';

const periodOptions: { value: Period; label: string }[] = [
  { value: 'today', label: 'Сегодня' },
  { value: 'week', label: '7 дней' },
  { value: 'month', label: '30 дней' },
];

function MetricCard({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {note && <p className="text-xs text-slate-500">{note}</p>}
    </div>
  );
}

function ActivityChart({ data }: { data: ActivityData[] }) {
  const maxValue = Math.max(
    ...data.map((d) => d.approved + d.rejected + d.requestChanges),
    1,
  );
  return (
    <div className="flex items-end gap-2">
      {data.map((item) => {
        const total = item.approved + item.rejected + item.requestChanges;
        const height = (total / maxValue) * 140;
        return (
          <div key={item.date} className="flex flex-col items-center gap-1 text-xs text-slate-600">
            <div className="flex h-[150px] w-10 flex-col justify-end overflow-hidden rounded-lg bg-slate-100">
              <div
                title={`Одобрено: ${item.approved}`}
                className="bg-emerald-500"
                style={{ height: `${(item.approved / (total || 1)) * height}px` }}
              />
              <div
                title={`Отклонено: ${item.rejected}`}
                className="bg-rose-500"
                style={{ height: `${(item.rejected / (total || 1)) * height}px` }}
              />
              <div
                title={`На доработку: ${item.requestChanges}`}
                className="bg-amber-500"
                style={{ height: `${(item.requestChanges / (total || 1)) * height}px` }}
              />
            </div>
            <span className="w-12 text-center">{item.date.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

function DecisionsChart({ data }: { data: DecisionsData }) {
  const total = data.approved + data.rejected + data.requestChanges || 1;
  const parts = [
    { label: 'Одобрено', value: data.approved, color: 'bg-emerald-500' },
    { label: 'Отклонено', value: data.rejected, color: 'bg-rose-500' },
    { label: 'Доработка', value: data.requestChanges, color: 'bg-amber-500' },
  ];
  return (
    <div className="space-y-2">
      <div className="flex h-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        {parts.map((part) => (
          <div
            key={part.label}
            className={part.color}
            style={{ width: `${(part.value / total) * 100}%` }}
            title={`${part.label}: ${Math.round((part.value / total) * 100)}%`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        {parts.map((part) => (
          <div key={part.label} className="flex items-center gap-2 text-slate-700">
            <span className={`h-3 w-3 rounded-full ${part.color}`} />
            {part.label}: {Math.round((part.value / total) * 100)}%
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriesChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const total = entries.reduce((acc, [, value]) => acc + value, 0) || 1;
  const max = Math.max(...entries.map(([, value]) => value), 1);

  return (
    <div className="space-y-2">
      {entries.map(([category, value]) => (
        <div key={category} className="space-y-1">
          <div className="flex items-center justify-between text-sm text-slate-700">
            <span>{category}</span>
            <span className="text-slate-500">
              {value} · {Math.round((value / total) * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsPage() {
  const [period, setPeriod] = useState<Period>('week');

  const summaryQuery = useQuery({
    queryKey: ['stats', 'summary', period],
    queryFn: ({ signal }) => statsApi.summary({ period }, signal),
  });
  const activityQuery = useQuery({
    queryKey: ['stats', 'activity', period],
    queryFn: ({ signal }) => statsApi.activity({ period }, signal),
  });
  const decisionsQuery = useQuery({
    queryKey: ['stats', 'decisions', period],
    queryFn: ({ signal }) => statsApi.decisions({ period }, signal),
  });
  const categoriesQuery = useQuery({
    queryKey: ['stats', 'categories', period],
    queryFn: ({ signal }) => statsApi.categories({ period }, signal),
  });

  const loading =
    summaryQuery.isLoading ||
    activityQuery.isLoading ||
    decisionsQuery.isLoading ||
    categoriesQuery.isLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Статистика модерации</h1>
          <p className="text-sm text-slate-500">
            Метрики по решениям, график активности и распределение по категориям.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                period === option.value ? 'bg-blue-600 text-white' : 'text-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          Загружаем статистику…
        </div>
      )}

      {(summaryQuery.isError || activityQuery.isError || decisionsQuery.isError) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          Не удалось загрузить статистику. Попробуйте позже.
        </div>
      )}

      {summaryQuery.data && (
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard
            title="Всего проверено"
            value={summaryQuery.data.totalReviewed.toString()}
            note={`Сегодня: ${summaryQuery.data.totalReviewedToday}`}
          />
          <MetricCard
            title="Одобрено"
            value={`${Math.round(summaryQuery.data.approvedPercentage)}%`}
            note={`За неделю: ${summaryQuery.data.totalReviewedThisWeek}`}
          />
          <MetricCard
            title="Отклонено"
            value={`${Math.round(summaryQuery.data.rejectedPercentage)}%`}
            note={`За месяц: ${summaryQuery.data.totalReviewedThisMonth}`}
          />
          <MetricCard
            title="На доработку"
            value={`${Math.round(summaryQuery.data.requestChangesPercentage)}%`}
            note={`Среднее время проверки: ${summaryQuery.data.averageReviewTime} мин`}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {activityQuery.data && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Активность по дням</h3>
              <span className="text-xs text-slate-500">Одобрено / Отклонено / Доработка</span>
            </div>
            <ActivityChart data={activityQuery.data} />
          </div>
        )}

        {decisionsQuery.data && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Распределение решений</h3>
            <DecisionsChart data={decisionsQuery.data} />
          </div>
        )}
      </div>

      {categoriesQuery.data && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Категории</h3>
          <CategoriesChart data={categoriesQuery.data} />
        </div>
      )}
    </div>
  );
}

export default StatsPage;
