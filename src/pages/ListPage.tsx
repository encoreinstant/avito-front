import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  useQuery,
  keepPreviousData,
  useQueryClient,
} from "@tanstack/react-query";
import {
  adsApi,
  MODERATION_REASONS,
  type ModerationReason,
} from "../shared/api/ads";
import type {
  AdStatus,
  AdsListResponse,
  Priority,
  SortBy,
  SortOrder,
} from "../shared/types";
import { formatDate, formatPrice } from "../shared/utils/format";

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

const DEFAULT_FILTERS: Filters = {
  search: "",
  statuses: ["pending"],
  categoryId: null,
  minPrice: null,
  maxPrice: null,
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 10,
};

const FILTERS_STORAGE_KEY = "listFilters";

const statusOptions: { value: AdStatus; label: string }[] = [
  { value: "pending", label: "На модерации" },
  { value: "approved", label: "Одобрено" },
  { value: "rejected", label: "Отклонено" },
];

const priorityLabel: Record<Priority, string> = {
  normal: "Обычный",
  urgent: "Срочный",
};

function StatusBadge({ status }: { status: AdStatus }) {
  const map: Record<AdStatus, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-rose-100 text-rose-800",
    draft: "bg-slate-100 text-slate-700",
  };

  const labels: Record<AdStatus, string> = {
    pending: "На модерации",
    approved: "Одобрено",
    rejected: "Отклонено",
    draft: "Черновик",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, string> = {
    normal: "bg-[#F1F5F9] text-[#334155]",
    urgent: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[priority]}`}
    >
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
  const [warning, setWarning] = useState<string | null>(null);
  const [lastWarning, setLastWarning] = useState<string>("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!warning) return;
    setLastWarning(warning);
    const t = setTimeout(() => setWarning(null), 3200);
    return () => clearTimeout(t);
  }, [warning]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key;
      const byCode = e.code === "Slash"; // работает независимо от раскладки
      const byKey = key === "/" || key === "?" || key === "." || key === ",";
      if ((byCode || byKey) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        const isFormElement =
          tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
        if (isFormElement) return;
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleStatus = (value: AdStatus) => {
    const exists = filters.statuses.includes(value);
    if (exists && filters.statuses.length === 1) {
      setWarning(
        "Нельзя снять единственный статус. Выберите другой и затем снимите текущий."
      );
      return;
    }
    const next = exists
      ? filters.statuses.filter((s) => s !== value)
      : [...filters.statuses, value];
    onChange({ statuses: next, page: 1 });
  };

  return (
    <div className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={searchRef}
            type="search"
            placeholder="Поиск по названию / описанию"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
            className="w-64 px-3 py-2 text-sm border outline-none rounded-xl border-slate-200 ring-blue-400 focus:border-blue-400 focus:ring-2"
          />
          <select
            className="w-40 px-3 py-2 text-sm border outline-none rounded-xl border-slate-200 text-slate-700 ring-blue-400 focus:border-blue-400 focus:ring-2"
            value={filters.categoryId ?? ""}
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
            <label className="text-xs tracking-wide uppercase text-slate-500">
              Цена
            </label>
            <input
              type="number"
              placeholder="от"
              value={filters.minPrice ?? ""}
              onChange={(e) =>
                onChange({
                  minPrice: e.target.value ? Number(e.target.value) : null,
                  page: 1,
                })
              }
              className="w-20 px-2 py-1 text-sm border rounded-lg outline-none border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 "
            />
            <input
              type="number"
              placeholder="до"
              value={filters.maxPrice ?? ""}
              onChange={(e) =>
                onChange({
                  maxPrice: e.target.value ? Number(e.target.value) : null,
                  page: 1,
                })
              }
              className="w-20 px-2 py-1 text-sm border rounded-lg outline-none border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 "
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="px-3 py-2 text-sm border outline-none rounded-xl border-slate-200 text-slate-700 ring-blue-400 focus:border-blue-400 focus:ring-2"
            value={`${filters.sortBy}:${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split(":") as [
                SortBy,
                SortOrder
              ];
              onChange({ sortBy, sortOrder, page: 1 });
            }}
          >
            <option value="createdAt:desc">Сначала новые</option>
            <option value="createdAt:asc">Сначала старые</option>
            <option value="price:asc">Цена: по возрастанию</option>
            <option value="price:desc">Цена: по убыванию</option>
            <option value="priority:asc">Сначала обычные</option>
            <option value="priority:desc">Сначала срочные</option>
          </select>

          <button
            onClick={onReset}
            className="px-3 py-2 text-sm font-semibold transition border rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600"
          >
            Сбросить
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        {statusOptions.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 px-3 py-2 text-sm transition border rounded-full shadow-sm border-slate-200 text-slate-700 hover:border-blue-400 "
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
      <div
        className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 transition-all duration-300 ${
          warning
            ? "opacity-100 translate-y-0"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <div className="px-4 py-2 text-sm font-semibold border rounded-full shadow-lg border-rose-200 bg-rose-100 text-rose-800">
          {warning ?? lastWarning}
        </div>
      </div>
    </div>
  );
}

function Pagination({
  pagination,
  onChange,
}: {
  pagination: AdsListResponse["pagination"];
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <div>
        Всего объявлений:{" "}
        <span className="font-semibold text-slate-900">
          {pagination.totalItems}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className={`px-3 py-1 font-medium border rounded-full text-slate-700 border-slate-300 transition-colors duration-200 dark:border-slate-600 dark:text-slate-300 ${
            pagination.currentPage <= 1
              ? "disabled:opacity-40"
              : "hover:bg-slate-200 dark:hover:bg-slate-600"
          }`}
          onClick={() => onChange(pagination.currentPage - 1)}
          disabled={pagination.currentPage <= 1}
        >
          ← Назад
        </button>
        <span>
          Страница {pagination.currentPage} / {pagination.totalPages}
        </span>
        <button
          className={`px-3 py-1 font-medium border rounded-full border-slate-300 text-slate-700 transition-colors duration-200 dark:border-slate-600 dark:text-slate-300 ${
            pagination.currentPage >= pagination.totalPages
              ? "disabled:opacity-40"
              : "hover:bg-slate-200 dark:hover:bg-slate-600"
          }`}
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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"choose" | "reject" | "changes">(
    "choose"
  );
  const [bulkReason, setBulkReason] = useState<ModerationReason>(
    MODERATION_REASONS[0]
  );
  const [bulkComment, setBulkComment] = useState("");
  const [bulkPending, setBulkPending] = useState(false);
  const selectedIdsLabel = useMemo(
    () =>
      selectedIds
        .slice()
        .sort((a, b) => a - b)
        .map((id) => `#${id}`)
        .join(", "),
    [selectedIds]
  );

  const parseFiltersFromSearch = (): Filters => {
    const params: Filters = { ...DEFAULT_FILTERS };
    const fromParams: Partial<Filters> = {};
    let hasParams = false;
    const statusesRaw = searchParams.get("status");
    if (statusesRaw) {
      const list = statusesRaw.split(",").filter(Boolean) as AdStatus[];
      if (list.length) {
        fromParams.statuses = list;
        hasParams = true;
      }
    }
    if (searchParams.get("search")) {
      fromParams.search = searchParams.get("search") || "";
      hasParams = true;
    }
    if (searchParams.get("categoryId")) {
      fromParams.categoryId = Number(searchParams.get("categoryId"));
      hasParams = true;
    }
    if (searchParams.get("minPrice") !== null) {
      fromParams.minPrice = searchParams.get("minPrice")
        ? Number(searchParams.get("minPrice"))
        : null;
      hasParams = true;
    }
    if (searchParams.get("maxPrice") !== null) {
      fromParams.maxPrice = searchParams.get("maxPrice")
        ? Number(searchParams.get("maxPrice"))
        : null;
      hasParams = true;
    }
    if (searchParams.get("sortBy")) {
      fromParams.sortBy = searchParams.get("sortBy") as SortBy;
      hasParams = true;
    }
    if (searchParams.get("sortOrder")) {
      fromParams.sortOrder = searchParams.get("sortOrder") as SortOrder;
      hasParams = true;
    }
    if (searchParams.get("page")) {
      fromParams.page = Number(searchParams.get("page"));
      hasParams = true;
    }

    if (!hasParams) {
      const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Filters;
          return { ...params, ...parsed };
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    return { ...params, ...fromParams };
  };

  const [filters, setFilters] = useState<Filters>(() =>
    parseFiltersFromSearch()
  );
  useEffect(() => {
    const parsed = parseFiltersFromSearch();
    setFilters((prev) => {
      const same = JSON.stringify(prev) === JSON.stringify(parsed);
      return same ? prev : parsed;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // Загружаем полный список категорий без фильтров, чтобы селект всегда был полным
  const categoriesAllQuery = useQuery<AdsListResponse>({
    queryKey: ["categories", "all"],
    queryFn: ({ signal }) => adsApi.list({ page: 1, limit: 500 }, signal),
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isError, error } = useQuery<AdsListResponse>({
    queryKey: ["ads", filters],
    queryFn: ({ signal }) =>
      adsApi.list(
        {
          page: filters.page,
          limit: filters.limit,
          search: filters.search || undefined,
          status: filters.statuses.flatMap((s) =>
            s === "pending" ? ["pending", "draft"] : [s]
          ),
          categoryId: filters.categoryId ?? undefined,
          minPrice: filters.minPrice ?? undefined,
          maxPrice: filters.maxPrice ?? undefined,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        },
        signal
      ),
    placeholderData: keepPreviousData,
  });

  // Удаляем из выделения объявления, которых нет в текущей выборке
  // Синхронизация фильтров с query-параметрами, чтобы сохранять состояние при навигации
  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (filters.search) nextParams.set("search", filters.search);
    if (filters.statuses.length)
      nextParams.set("status", filters.statuses.join(","));
    if (filters.categoryId !== null && filters.categoryId !== undefined)
      nextParams.set("categoryId", String(filters.categoryId));
    if (filters.minPrice !== null && filters.minPrice !== undefined)
      nextParams.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice !== null && filters.maxPrice !== undefined)
      nextParams.set("maxPrice", String(filters.maxPrice));
    if (filters.sortBy !== DEFAULT_FILTERS.sortBy)
      nextParams.set("sortBy", filters.sortBy);
    if (filters.sortOrder !== DEFAULT_FILTERS.sortOrder)
      nextParams.set("sortOrder", filters.sortOrder);
    if (filters.page !== DEFAULT_FILTERS.page)
      nextParams.set("page", String(filters.page));
    if (filters.limit !== DEFAULT_FILTERS.limit)
      nextParams.set("limit", String(filters.limit));
    setSearchParams(nextParams, { replace: true });
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }, [filters, setSearchParams]);

  const categoryOptions = useMemo(() => {
    const map = new Map<number, string>();
    const collect = (ads?: AdsListResponse["ads"]) => {
      ads?.forEach((ad) => {
        if (!map.has(ad.categoryId)) map.set(ad.categoryId, ad.category);
      });
    };
    collect(categoriesAllQuery.data?.ads);
    collect(data?.ads);
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "ru"));
  }, [categoriesAllQuery.data, data]);

  const handleChange = (next: Partial<Filters>) =>
    setFilters((prev) => ({ ...prev, ...next }));

  const handleReset = () => setFilters({ ...DEFAULT_FILTERS });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const runBulk = async (action: "approve" | "reject" | "changes") => {
    if (!selectedIds.length) return;
    setBulkPending(true);
    try {
      await Promise.all(
        selectedIds.map((id) => {
          if (action === "approve") return adsApi.approve(id);
          if (action === "reject")
            return adsApi.reject(id, {
              reason: bulkReason,
              comment: bulkComment || undefined,
            });
          return adsApi.requestChanges(id, {
            reason: bulkReason,
            comment: bulkComment || undefined,
          });
        })
      );
      await queryClient.invalidateQueries({ queryKey: ["ads"] });
      clearSelection();
      setBulkOpen(false);
      setBulkMode("choose");
      setBulkComment("");
    } finally {
      setBulkPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Список объявлений
          </h1>
          <p className="text-sm text-slate-500">
            Фильтруйте по статусу, категории, цене, ищите по названию или
            описанию, а также сортируйте и переходите по страницам.
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
        <div className="p-6 bg-white border rounded-2xl border-slate-200 text-slate-500">
          Загружаем данные…
        </div>
      )}

      {isError && (
        <div className="p-6 border rounded-2xl border-rose-200 bg-rose-50 text-rose-700">
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
                state={{ from: `${location.pathname}${location.search}` }}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-48 bg-slate-100">
                  <img
                    src={
                      ad.images?.[0] ||
                      "https://placehold.co/600x400/EEF2FF/334155?text=Нет+фото"
                    }
                    alt={ad.title}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute flex gap-2 left-3 top-3">
                    <StatusBadge status={ad.status} />
                    <PriorityBadge priority={ad.priority} />
                  </div>
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="absolute flex items-center px-2 py-2 bg-white border rounded-full shadow-sm right-3 top-3 border-slate-200"
                  >
                    <input
                      type="checkbox"
                      className=" accent-blue-600"
                      checked={selectedIds.includes(ad.id)}
                      onChange={() => toggleSelect(ad.id)}
                    />
                  </label>
                </div>
                <div className="flex flex-col flex-1 gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {ad.title}
                      </h3>
                      <p className="text-sm text-slate-500">{ad.category}</p>
                    </div>
                    <div className="text-base font-semibold text-right text-slate-900">
                      {formatPrice(ad.price)}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    {ad.description.length > 140
                      ? `${ad.description.slice(0, 140)}…`
                      : ad.description}
                  </p>
                  <div className="flex items-center justify-between mt-auto text-xs text-slate-500">
                    <span>Создано: {formatDate(ad.createdAt)}</span>
                    <span>ID {ad.id}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Pagination
            pagination={data.pagination}
            onChange={(page) => handleChange({ page })}
          />
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="fixed inset-x-0 z-40 flex justify-center pointer-events-none bottom-4">
          <div className="flex items-center gap-3 px-4 py-3 text-white bg-blue-600 rounded-full shadow-lg pointer-events-auto shadow-blue-500/40 dark:bg-blue-500">
            <span className="text-sm font-semibold">
              Выбрано: {selectedIds.length}
            </span>
            <button
              onClick={() => {
                setBulkOpen(true);
                setBulkMode("choose");
              }}
              className="px-3 py-1 text-sm font-semibold transition rounded-full bg-white/15 hover:bg-white/25"
            >
              Групповые действия
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-sm font-semibold transition rounded-full bg-white/15 hover:bg-white/25"
            >
              Сбросить выбор
            </button>
          </div>
        </div>
      )}

      {bulkOpen && (
        <div
          className="fixed -inset-4 z-[9999] m-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setBulkOpen(false)}
        >
          <div
            className="w-full max-w-xl p-5 bg-white border shadow-2xl rounded-2xl border-slate-200 dark:border-slate-700 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Групповые действия ({selectedIds.length})
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  Выберите действие для отмеченных объявлений:{" "}
                  {selectedIdsLabel}
                </p>
              </div>
              <button
                onClick={() => setBulkOpen(false)}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {bulkMode === "choose" && (
              <div className="grid gap-2 mt-4 sm:grid-cols-3">
                <button
                  onClick={() => runBulk("approve")}
                  disabled={bulkPending}
                  className="px-4 py-3 text-sm font-semibold text-white transition shadow-sm rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                >
                  Одобрить ({selectedIds.length})
                </button>
                <button
                  onClick={() => setBulkMode("reject")}
                  disabled={bulkPending}
                  className="px-4 py-3 text-sm font-semibold text-white transition shadow-sm rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60"
                >
                  Отклонить ({selectedIds.length})
                </button>
                <button
                  onClick={() => setBulkMode("changes")}
                  disabled={bulkPending}
                  className="px-4 py-3 text-sm font-semibold text-white transition shadow-sm rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60"
                >
                  На доработку ({selectedIds.length})
                </button>
              </div>
            )}

            {bulkMode !== "choose" && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {bulkMode === "reject"
                    ? "Укажите причину отклонения"
                    : "Укажите причину возврата на доработку"}
                </p>
                <select
                  className="w-full px-3 py-2 text-sm border rounded-lg outline-none border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  value={bulkReason}
                  onChange={(e) =>
                    setBulkReason(e.target.value as ModerationReason)
                  }
                >
                  {MODERATION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <textarea
                  value={bulkComment}
                  onChange={(e) => setBulkComment(e.target.value)}
                  placeholder="Комментарий (необязательно)"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border rounded-lg outline-none border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setBulkMode("choose");
                      setBulkComment("");
                    }}
                    className="px-3 py-2 text-sm font-semibold transition border rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Назад
                  </button>
                  <button
                    onClick={() =>
                      runBulk(bulkMode === "reject" ? "reject" : "changes")
                    }
                    disabled={bulkPending}
                    className="px-4 py-2 text-sm font-semibold text-white transition bg-blue-600 shadow-sm rounded-xl hover:bg-blue-500 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ListPage;
