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
//Опции выбора периода для фильтрации статистики
const periodOptions: { value: Period; label: string }[] = [
  { value: "today", label: "Сегодня" },
  { value: "week", label: "7 дней" },
  { value: "month", label: "30 дней" },
];
//Компонент отображения одной метрики с заголовком, значением и заметкой
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
//Компонент отображения столбчатой диаграммы активности по дням
function ActivityChart({ data }: { data: ActivityData[] }) {
  //Определяем максимальное значение для масштабирования высоты столбцов
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
            <div className="flex h-[150px] w-10 flex-col justify-end overflow-hidden rounded-lg bg-[#F1F5F9] dark:bg-[#41454e]">
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
//Компонент для отображения круговой диаграммы решений
function DecisionsChart({
  data,
  reviewed,
}: {
  data: DecisionsData;
  reviewed: number;
}) {
  const rawTotal = data.approved + data.rejected + data.requestChanges;
  const total = rawTotal || 1;
  const isEmpty = rawTotal === 0;
  //формируем части диаграммы с цветами
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
  //вычисляем конусы для conic-gradient
  let current = 0;
  const gradientStops = isEmpty
    ? "#cbd5e1 0 100%"
    : parts
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
            {reviewed} объявлений
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
              {Math.round(part.ad * (part.value / total))} объяв.,{" "}
              {Math.round((part.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
//Компонент для отображения распределения по категориям
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
            className="p-3 transition border shadow-sm rounded-xl border-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-100 dark:hover:bg-slate-600"
          >
            <div className="flex items-center justify-between text-sm text-slate-700">
              <span className="font-semibold text-slate-900">{category}</span>
              <span className="text-slate-900">
                {value} объяв. · {percent}%
              </span>
            </div>
            <div className="h-3 mt-3 rounded-full bg-slate-200">
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
//Главный компонент страницы статистики
function StatsPage() {
  const [period, setPeriod] = useState<Period>("week");
  //Запросы к API для получения статистики
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
  //Выбираем последние 8 дней для графика активности
  const activityPeriod = useMemo(
    () => (activityQuery.data ? activityQuery.data.slice(-8) : []),
    [activityQuery.data]
  );
  //Вычисление процентов решений (одобрено/отклонено/доработка)
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
  //Проверка загрузки данных
  const loading =
    summaryQuery.isLoading ||
    activityQuery.isLoading ||
    decisionsQuery.isLoading ||
    categoriesQuery.isLoading;
  //Объединяем данные категорий с учетом всех объявлений
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
  //Функция экспорта CSV с данными статистики
  const downloadCsv = () => {
    const safe = (value: unknown) =>
      `"${String(value ?? "")
        .replace(/"/g, '""')
        .replace(/\n/g, " ")
        .replace(/\r/g, " ")}"`;

    const lines: string[] = [];
    lines.push("Раздел;Параметр;Значение");

    if (summaryQuery.data) {
      lines.push(
        `Итоги;Всего проверено (Объявлений);${summaryQuery.data.totalReviewed}`,
        `Итоги;Одобрено (%);${Math.round(decisionsPercents.approved)}`,
        `Итоги;Отклонено (%);${Math.round(decisionsPercents.rejected)}`,
        `Итоги;На доработке (%);${Math.round(
          decisionsPercents.requestChanges
        )}`,
        `Итоги;Среднее время проверки;${summaryQuery.data.averageReviewTime} у.е.`
      );
    }
    {
    }
    if (decisionsQuery.data && summaryQuery.data) {
      lines.push(
        `Распределение;Одобрено (Объявлений);${Math.round(
          (decisionsQuery.data.approved / 100) * summaryQuery.data.totalReviewed
        )}`,
        `Распределение;Отклонено (Объявлений);${Math.round(
          (decisionsQuery.data.rejected / 100) * summaryQuery.data.totalReviewed
        )}`,
        `Распределение;На доработке (Объявлений);${Math.round(
          (decisionsQuery.data.requestChanges / 100) *
            summaryQuery.data.totalReviewed
        )}`
      );
    }

    if (activityPeriod.length) {
      lines.push("Активность;Дата;Одобрено, Отклонено, Доработка");
      activityPeriod.forEach((day) => {
        lines.push(
          `Активность;${safe(day.date)};${day.approved}, ${day.rejected}, ${
            day.requestChanges
          }`
        );
      });
    }

    if (Object.keys(categoriesMerged).length) {
      lines.push("Категории;Название категории;Количество объявлений");
      Object.entries(categoriesMerged).forEach(([category, value]) => {
        lines.push(`Категории;${safe(category)};${value}`);
      });
    }

    //Добавляем BOM, чтобы Excel корректно открыл UTF-8 и показал русский текст
    const csv = "\ufeff" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const now = new Date();
    const date = `${String(now.getDate()).padStart(2, "0")}.${String(
      now.getMonth() + 1
    ).padStart(2, "0")}.${now.getFullYear()}`;
    link.download = `stats_${period}_${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  //Функция экспорта PDF/печати отчета
  const exportPdf = () => {
    if (
      !summaryQuery.data ||
      !decisionsQuery.data ||
      !categoriesMerged ||
      !activityPeriod
    ) {
      return;
    }

    const fmtDate = (value: string) =>
      new Date(value).toLocaleDateString("ru-RU");

    const today = new Date();
    const dateStr = today.toLocaleDateString("ru-RU");

    const rows: string[] = [];
    rows.push(
      `<h2>Статистика (${
        periodOptions.find((p) => p.value === period)?.label ?? period
      })</h2>`
    );
    rows.push(
      "<h3>Итоги</h3>",
      `<p>Всего проверено: <strong>${summaryQuery.data.totalReviewed} Объявлений</strong></p>`,
      `<p>Одобрено: ${decisionsPercents.approved}%</p>`,
      `<p>Отклонено: ${decisionsPercents.rejected}%</p>`,
      `<p>На доработке: ${decisionsPercents.requestChanges}%</p>`,
      `<p>Среднее время проверки: ${summaryQuery.data.averageReviewTime} у.е.</p>`
    );

    rows.push(
      "<h3>Распределение решений (Количество объявлений)</h3>",
      `<p>Одобрено: ${Math.round(
        (decisionsQuery.data.approved / 100) * summaryQuery.data.totalReviewed
      )}</p>`,
      `<p>Отклонено: ${Math.round(
        (decisionsQuery.data.rejected / 100) * summaryQuery.data.totalReviewed
      )}</p>`,
      `<p>На доработке: ${Math.round(
        (decisionsQuery.data.requestChanges / 100) *
          summaryQuery.data.totalReviewed
      )}</p>`
    );

    if (activityPeriod.length) {
      rows.push(
        "<h3>Активность по дням (за прошедшую неделю)</h3>",
        `<table style="border-collapse:collapse;width:100%;max-width:520px;">
           <thead>
             <tr>
               <th style="border:1px solid #cbd5e1;padding:6px 8px;text-align:left;">Дата</th>
               <th style="border:1px solid #cbd5e1;padding:6px 8px;text-align:right;">Одобрено</th>
               <th style="border:1px solid #cbd5e1;padding:6px 8px;text-align:right;">Отклонено</th>
               <th style="border:1px solid #cbd5e1;padding:6px 8px;text-align:right;">Доработка</th>
             </tr>
           </thead>
           <tbody>`
      );
      activityPeriod.forEach((day) => {
        rows.push(
          `<tr>
             <td style="border:1px solid #e2e8f0;padding:6px 8px;">${fmtDate(
               day.date
             )}</td>
             <td style="border:1px solid #e2e8f0;padding:6px 8px;text-align:right;">${
               day.approved
             }</td>
             <td style="border:1px solid #e2e8f0;padding:6px 8px;text-align:right;">${
               day.rejected
             }</td>
             <td style="border:1px solid #e2e8f0;padding:6px 8px;text-align:right;">${
               day.requestChanges
             }</td>
           </tr>`
        );
      });
      rows.push("</tbody></table>");
    }

    if (Object.keys(categoriesMerged).length) {
      rows.push(
        "<h3>Категории (Категория: количество объявлений)</h3>",
        "<ul>"
      );
      Object.entries(categoriesMerged).forEach(([category, value]) => {
        rows.push(`<li>${category}: ${value}</li>`);
      });
      rows.push("</ul>");
    }

    const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Отчет ${period} ${dateStr}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
    h1 { margin: 0 0 12px; }
    h2 { margin: 16px 0 8px; }
    h3 { margin: 12px 0 6px; }
    p { margin: 4px 0; }
    ul { margin: 6px 0 12px 20px; padding: 0; }
  </style>
</head>
<body>
  <h1>Отчет по модерации</h1>
  <p>Дата формирования: ${dateStr}</p>
  ${rows.join("\n")}
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };
  //JSX разметка страницы
  return (
    <div className="space-y-4 animate-page">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/*Заголовок и кнопки экспорта */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Статистика модерации
          </h1>
          <p className="text-sm text-slate-500">
            Метрики по статусам, графики и распределение по категориям.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 p-1 bg-white border rounded-full shadow-sm border-slate-200">
            <button
              title="Экспорт CSV за выбранный период"
              type="button"
              onClick={downloadCsv}
              className="px-3 py-1 text-sm font-semibold transition-colors duration-200 rounded-full text-slate-700 hover:bg-blue-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              Экспорт CSV
            </button>
            <button
              title="Экспорт PDF за выбранный период (печать/сохранение)"
              type="button"
              onClick={exportPdf}
              className="px-3 py-1 text-sm font-semibold transition-colors duration-200 rounded-full text-slate-700 hover:bg-blue-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              Экспорт PDF
            </button>
          </div>
          <div className="flex items-center gap-2 p-1 bg-white border rounded-full shadow-sm border-slate-200">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                  period === option.value
                    ? "bg-blue-600 text-white"
                    : "transition-colors duration-200 text-slate-700 hover:bg-blue-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="p-6 bg-white border rounded-2xl border-slate-200 text-slate-500">
          Загружаем статистику…
        </div>
      )}

      {(summaryQuery.isError ||
        activityQuery.isError ||
        decisionsQuery.isError ||
        categoriesQuery.isError) && (
        <div className="p-6 border rounded-2xl border-rose-200 bg-rose-50 text-rose-700">
          Не удалось загрузить статистику. Попробуйте позже.
        </div>
      )}

      {summaryQuery.data && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {/*Метрики */}
          <MetricCard
            title="Всего проверено"
            value={`${summaryQuery.data.totalReviewed} объявлений`}
          />
          <MetricCard
            title="Одобрено"
            value={`${decisionsPercents.approved}%`}
            valueClassName="text-emerald-600"
          />
          <MetricCard
            title="Отклонено"
            value={`${decisionsPercents.rejected}%`}
            valueClassName="text-rose-600"
          />
          <MetricCard
            title="На доработке"
            value={`${decisionsPercents.requestChanges}%`}
            valueClassName="text-amber-600"
          />
          <MetricCard
            title="Среднее время проверки"
            value={`${summaryQuery.data.averageReviewTime} у.е.`}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/*График активности */}
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
            {/*Распределение решений */}
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
          {/*Распределение по категориям */}
          <h3 className="text-lg font-semibold text-slate-900">Категории</h3>
          <CategoriesChart data={categoriesMerged} />
        </div>
      )}
    </div>
  );
}

export default StatsPage;
