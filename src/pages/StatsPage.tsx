import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { statsApi } from "../shared/api/stats";
import { adsApi } from "../shared/api/ads";
import type {
  ActivityData,
  AdsListResponse,
  DecisionsData,
  Period,
} from "../shared/types";

const periodOptions: { value: Period; label: string }[] = [
  { value: "today", label: "Сегодня" },
  { value: "week", label: "7 дней" },
  { value: "month", label: "30 дней" },
];

function MetricCard({
  title,
  value,
  note,
  valueClassName,
}: {
  title: string;
  value: string;
  note?: string;
  valueClassName?: string;
}) {
  return (
    <div className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
      <p className="text-sm text-slate-500">{title}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          valueClassName || "text-slate-900"
        }`}
      >
        {value}
      </p>
      {note && <p className="text-xs text-slate-500">{note}</p>}
    </div>
  );
}

function ActivityChart({ data }: { data: ActivityData[] }) {
  const maxValue = Math.max(
    ...data.map((d) => d.approved + d.rejected + d.requestChanges),
    1
  );
  return (
    <div className="flex items-end justify-center gap-2">
      {data.map((item) => {
        const total = item.approved + item.rejected + item.requestChanges;
        const height = (total / maxValue) * 140;
        const dateObj = new Date(item.date);
        const label = `${String(dateObj.getDate()).padStart(2, "0")}.${String(
          dateObj.getMonth() + 1
        ).padStart(2, "0")}`;
        return (
          <div
            key={item.date}
            className="flex flex-col items-center gap-1 text-xs text-slate-600"
          >
            <div className="flex h-[150px] w-10 flex-col justify-end overflow-hidden rounded-lg bg-slate-100">
              <div
                title={`Одобрено: ${item.approved}`}
                className="bg-emerald-500"
                style={{
                  height: `${(item.approved / (total || 1)) * height}px`,
                }}
              />
              <div
                title={`Отклонено: ${item.rejected}`}
                className="bg-rose-500"
                style={{
                  height: `${(item.rejected / (total || 1)) * height}px`,
                }}
              />
              <div
                title={`На доработке: ${item.requestChanges}`}
                className="bg-amber-500"
                style={{
                  height: `${(item.requestChanges / (total || 1)) * height}px`,
                }}
              />
            </div>
            <span className="w-12 text-center">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function DecisionsChart({
  data,
  reviewed,
}: {
  data: DecisionsData;
  reviewed: number;
}) {
  const total = data.approved + data.rejected + data.requestChanges || 1;
  const parts = [
    { label: "Одобрено", value: data.approved, ad: reviewed, color: "#10b981" }, // emerald-500
    {
      label: "Отклонено",
      value: data.rejected,
      ad: reviewed,
      color: "#f43f5e",
    }, // rose-500
    {
      label: "На доработке",
      value: data.requestChanges,
      ad: reviewed,
      color: "#f59e0b",
    }, // amber-500
  ];
  let current = 0;
  const gradientStops = parts
    .map((part) => {
      const from = current;
      const pct = (part.value / total) * 100;
      const to = current + pct;
      current = to;
      return `${part.color} ${from}% ${to}%`;
    })
    .join(", ");

  return (
    <div className="grid gap-3 md:grid-cols-[auto_1fr] items-center">
      <div
        className="relative w-48 h-48 border rounded-full shadow-sm border-slate-200"
        style={{ background: `conic-gradient(${gradientStops})` }}
      >
        <div className="absolute flex flex-col items-center justify-center bg-white border rounded-full inset-4 border-slate-100">
          <p className="text-xs text-slate-500">Всего</p>
          <p className="text-lg font-semibold text-slate-900">
            {reviewed + " Объявлений"}
          </p>
        </div>
      </div>
      <div className="grid gap-2 text-sm text-slate-700">
        {parts.map((part) => (
          <div
            key={part.label}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: part.color }}
              />
              <span>{part.label}</span>
            </div>
            <span className="font-semibold text-slate-900">
              {Math.round(part.ad * (part.value / total)) + " Объяв."}
              {", " + Math.round((part.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriesChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const total = entries.reduce((acc, [, value]) => acc + value, 0) || 1;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map(([category, value]) => {
        const percent = Math.round((value / total) * 100);
        return (
          <div
            key={category}
            className="p-3 border rounded-xl border-slate-200 bg-slate-50/60 shadow-sm"
          >
            <div className="flex items-center justify-between text-sm text-slate-700">
              <span className="font-semibold text-slate-900">{category}</span>
              <span className="text-slate-500">
                {value} · {percent}%
              </span>
            </div>
            <div className="mt-3 h-3 rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatsPage() {
  const [period, setPeriod] = useState<Period>("week");

  const summaryQuery = useQuery({
    queryKey: ["stats", "summary", period],
    queryFn: ({ signal }) => statsApi.summary({ period }, signal),
  });
  const activityQuery = useQuery({
    queryKey: ["stats", "activity", "week-fixed"],
    queryFn: ({ signal }) => statsApi.activity({ period: "week" }, signal),
  });
  const decisionsQuery = useQuery({
    queryKey: ["stats", "decisions", period],
    queryFn: ({ signal }) => statsApi.decisions({ period }, signal),
  });
  const categoriesQuery = useQuery({
    queryKey: ["stats", "categories", period],
    queryFn: ({ signal }) => statsApi.categories({ period }, signal),
  });
  const categoriesAllQuery = useQuery<AdsListResponse>({
    queryKey: ["categories", "all-ads"],
    queryFn: ({ signal }) => adsApi.list({ page: 1, limit: 500 }, signal),
    staleTime: 5 * 60 * 1000,
  });

  const activityPeriod = useMemo(
    () => (activityQuery.data ? activityQuery.data.slice(-8) : []),
    [activityQuery.data]
  );

  const decisionsPercents = useMemo(() => {
    if (decisionsQuery.data) {
      const { approved, rejected, requestChanges } = decisionsQuery.data;
      const denom = approved + rejected + requestChanges || 1;
      return {
        approved: Math.round((approved / denom) * 100),
        rejected: Math.round((rejected / denom) * 100),
        requestChanges: Math.round((requestChanges / denom) * 100),
      };
    }
    if (summaryQuery.data) {
      const a = summaryQuery.data.approvedPercentage;
      const r = summaryQuery.data.rejectedPercentage;
      const rc = summaryQuery.data.requestChangesPercentage;
      const denom = a + r + rc || 1;
      return {
        approved: Math.round((a / denom) * 100),
        rejected: Math.round((r / denom) * 100),
        requestChanges: Math.round((rc / denom) * 100),
      };
    }
    return { approved: 0, rejected: 0, requestChanges: 0 };
  }, [decisionsQuery.data, summaryQuery.data]);

  const loading =
    summaryQuery.isLoading ||
    activityQuery.isLoading ||
    decisionsQuery.isLoading ||
    categoriesQuery.isLoading;

  const categoriesMerged = useMemo(() => {
    const map = new Map<string, number>();
    categoriesAllQuery.data?.ads.forEach((ad) => {
      if (!map.has(ad.category)) map.set(ad.category, 0);
    });
    if (categoriesQuery.data) {
      Object.entries(categoriesQuery.data).forEach(([category, value]) => {
        map.set(category, value);
      });
    }
    return Object.fromEntries(
      Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "ru"))
    );
  }, [categoriesAllQuery.data, categoriesQuery.data]);

  const totalReviewedDisplayed = useMemo(() => {
    if (!summaryQuery.data) return 0;
    switch (period) {
      case "today":
        return summaryQuery.data.totalReviewedToday;
      case "week":
        return summaryQuery.data.totalReviewedThisWeek;
      case "month":
        return summaryQuery.data.totalReviewedThisMonth;
      default:
        return summaryQuery.data.totalReviewed;
    }
  }, [period, summaryQuery.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Статистика модерации
          </h1>
          <p className="text-sm text-slate-500">
            Метрики по статусам, графики и распределение по категориям.
          </p>
        </div>
        <div className="flex items-center gap-2 p-1 bg-white border rounded-full shadow-sm border-slate-200">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                period === option.value
                  ? "bg-blue-600 text-white"
                  : "text-slate-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="p-6 bg-white border rounded-2xl border-slate-200 text-slate-500">
          Загружаем статистику…
        </div>
      )}

      {(summaryQuery.isError ||
        activityQuery.isError ||
        decisionsQuery.isError) && (
        <div className="p-6 border rounded-2xl border-rose-200 bg-rose-50 text-rose-700">
          Не удалось загрузить статистику. Попробуйте позже.
        </div>
      )}

      {summaryQuery.data && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="Всего проверено"
            value={summaryQuery.data.totalReviewed.toString() + " Объявлений"}
            // note={`Сегодня: ${summaryQuery.data.totalReviewedToday}`}
          />
          <MetricCard
            title="Одобрено"
            value={`${decisionsPercents.approved}%`}
            valueClassName="text-emerald-600"
            // note={`За неделю: ${summaryQuery.data.totalReviewedThisWeek}`}
          />
          <MetricCard
            title="Отклонено"
            value={`${decisionsPercents.rejected}%`}
            valueClassName="text-rose-600"
            // note={`За месяц: ${summaryQuery.data.totalReviewedThisMonth}`}
          />
          <MetricCard
            title="На доработке"
            value={`${decisionsPercents.requestChanges}%`}
            valueClassName="text-amber-600"
            // note={`За период: ${summaryQuery.data.requestChangesPercentage}%`}
          />
          <MetricCard
            title="Среднее время проверки"
            value={`${summaryQuery.data.averageReviewTime} у.е.`}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {activityPeriod.length > 0 && (
          <div className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Активность по дням
                </h3>
                <p className="text-xs text-slate-500">за прошедшую неделю</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Одобрено
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Отклонено
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  На доработке
                </span>
              </div>
            </div>

            <ActivityChart data={activityPeriod} />
          </div>
        )}

        {decisionsQuery.data && summaryQuery.data !== undefined && (
          <div className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              Распределение решений
            </h3>

            <DecisionsChart
              data={decisionsQuery.data}
              reviewed={summaryQuery.data.totalReviewed}
            />
          </div>
        )}
      </div>

      {Object.keys(categoriesMerged).length > 0 && (
        <div className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Категории</h3>
          <CategoriesChart data={categoriesMerged} />
        </div>
      )}
    </div>
  );
}

export default StatsPage;
