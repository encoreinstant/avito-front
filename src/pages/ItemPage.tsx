import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adsApi,
  MODERATION_REASONS,
  type ModerationReason,
} from "../shared/api/ads";
import type {
  Advertisement,
  ModerationAction,
  AdStatus,
  SortBy,
  SortOrder,
} from "../shared/types";
import {
  formatDate,
  formatDateTime,
  formatPrice,
} from "../shared/utils/format";
import { HotkeyIntroContext } from "../App";

type ActionMode = "idle" | "reject" | "requestChanges";

function StatusBadge({ status }: { status: Advertisement["status"] }) {
  const map: Record<Advertisement["status"], string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-rose-100 text-rose-800",
    draft: "bg-slate-100 text-slate-700",
  };
  const labels: Record<Advertisement["status"], string> = {
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

function PriorityBadge({ priority }: { priority: Advertisement["priority"] }) {
  const map: Record<Advertisement["priority"], string> = {
    normal: "bg-slate-100 text-slate-700",
    urgent: "bg-rose-100 text-rose-700",
  };
  const labels: Record<Advertisement["priority"], string> = {
    normal: "Обычный",
    urgent: "Срочный",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[priority]}`}
    >
      {labels[priority]}
    </span>
  );
}

function ModerationHistoryList({
  history,
}: {
  history: Advertisement["moderationHistory"];
}) {
  const sorted = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const actionLabels: Record<ModerationAction, string> = {
    approved: "Одобрено",
    rejected: "Отклонено",
    requestChanges: "На доработке",
  };

  return (
    <div className="space-y-3">
      {sorted.map((entry) => (
        <div
          key={entry.id}
          className="px-3 py-2 text-sm border rounded-xl border-slate-200 bg-slate-50 text-slate-700"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold">{actionLabels[entry.action]}</span>
            <span className="text-xs text-slate-500">
              {formatDateTime(entry.timestamp)}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Модератор: {entry.moderatorName}
          </div>
          {entry.reason && (
            <div className="text-sm text-slate-700">
              Причина: {entry.reason}
            </div>
          )}
          {entry.comment && (
            <div className="text-sm text-slate-600">
              Комментарий: {entry.comment}
            </div>
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
  const hotkeyIntro = useContext(HotkeyIntroContext);

  const adId = Number(id);
  const backTo = (location.state as { from?: string } | null)?.from ?? "/list";

  const parseFiltersFromBackLink = () => {
    const search = backTo.includes("?") ? backTo.split("?")[1] : "";
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

    const statusRaw = params.get("status");
    if (statusRaw)
      filters.statuses = statusRaw.split(",").filter(Boolean) as AdStatus[];
    const searchValue = params.get("search");
    if (searchValue) filters.search = searchValue;
    const cat = params.get("categoryId");
    if (cat !== null && cat !== "") filters.categoryId = Number(cat);
    const min = params.get("minPrice");
    if (min !== null) filters.minPrice = min ? Number(min) : undefined;
    const max = params.get("maxPrice");
    if (max !== null) filters.maxPrice = max ? Number(max) : undefined;
    const sortBy = params.get("sortBy") as SortBy | null;
    if (sortBy) filters.sortBy = sortBy;
    const sortOrder = params.get("sortOrder") as SortOrder | null;
    if (sortOrder) filters.sortOrder = sortOrder;

    return filters;
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["ad", adId],
    enabled: Number.isFinite(adId),
    queryFn: ({ signal }) => adsApi.get(adId, signal),
  });

  const backFilters = useMemo(() => parseFiltersFromBackLink(), [backTo]);

  const allAdsQuery = useQuery({
    queryKey: ["ads", "navigation", backFilters],
    queryFn: ({ signal }) =>
      adsApi.list(
        {
          page: 1,
          limit: 500,
          search: backFilters.search,
          categoryId: backFilters.categoryId,
          minPrice: backFilters.minPrice,
          maxPrice: backFilters.maxPrice,
          sortBy: backFilters.sortBy ?? "createdAt",
          sortOrder: backFilters.sortOrder ?? "desc",
          status: (backFilters.statuses ?? ["pending"]).flatMap((s) =>
            s === "pending" ? ["pending", "draft"] : [s]
          ),
        },
        signal
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

  const [actionMode, setActionMode] = useState<ActionMode>("idle");
  const [reason, setReason] = useState<ModerationReason>(MODERATION_REASONS[0]);
  const [comment, setComment] = useState("");
  const [hotkeyNotice, setHotkeyNotice] = useState<string | null>(null);
  const [hotkeyType, setHotkeyType] = useState<
    "approve" | "reject" | "changes" | null
  >(null);
  const [hotkeyVisible, setHotkeyVisible] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ad", adId] });
    queryClient.invalidateQueries({ queryKey: ["ads"] });
  };

  const showApproveNotice = () => {
    setHotkeyNotice("Объявление одобрено");
    setHotkeyType("approve");
  };

  const showRejectNotice = () => {
    setHotkeyNotice("Объявление отклонено");
    setHotkeyType("reject");
  };
  const showRequestChangesNotice = () => {
    setHotkeyNotice("Отправлено на доработку");
    setHotkeyType("changes");
  };

  const approveMutation = useMutation({
    mutationFn: () => adsApi.approve(adId),
    onSuccess: () => {
      invalidate();
      showApproveNotice();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      adsApi.reject(adId, { reason, comment: comment || undefined }),
    onSuccess: () => {
      invalidate();
      setActionMode("idle");
      setComment("");
      showRejectNotice();
    },
  });

  const requestChangesMutation = useMutation({
    mutationFn: () =>
      adsApi.requestChanges(adId, { reason, comment: comment || undefined }),
    onSuccess: () => {
      invalidate();
      setActionMode("idle");
      setComment("");
      showRequestChangesNotice();
    },
  });

  useEffect(() => {
    if (!hotkeyNotice) return;
    setHotkeyVisible(true);
    const hideTimer = setTimeout(() => setHotkeyVisible(false), 3200);
    const clearTimer = setTimeout(() => {
      setHotkeyNotice(null);
      setHotkeyType(null);
    }, 3400);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(clearTimer);
    };
  }, [hotkeyNotice]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const isFormElement =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      const key = e.key.toLowerCase();
      const isApproveKey = key === "a" || key === "ф";
      const isRejectKey = key === "d" || key === "в";

      if (isFormElement) return;

      if (isApproveKey) {
        e.preventDefault();
        approveMutation.mutate();
      }

      if (isRejectKey) {
        e.preventDefault();
        setActionMode("reject");
        setHotkeyNotice("Выберите причину отклонения");
        setHotkeyType("reject");
      }

      if (e.key === "ArrowLeft" && prevNext.prevId) {
        e.preventDefault();
        navigate(`/item/${prevNext.prevId}`, { state: { from: backTo } });
      }

      if (e.key === "ArrowRight" && prevNext.nextId) {
        e.preventDefault();
        navigate(`/item/${prevNext.nextId}`, { state: { from: backTo } });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [approveMutation, backTo, navigate, prevNext.nextId, prevNext.prevId]);

  if (!adId) {
    return (
      <div className="p-6 border rounded-2xl border-rose-200 bg-rose-50 text-rose-700">
        Некорректный идентификатор.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hotkeyNotice && (
        <div
          className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 transition-all duration-200 ${
            hotkeyVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2"
          }`}
        >
          <div
            className={`rounded-full px-4 py-2 text-sm font-semibold shadow-md backdrop-blur border ${
              hotkeyType === "reject"
                ? "bg-rose-50 text-rose-700 border-rose-200 shadow-rose-200/60"
                : hotkeyType === "changes"
                ? "bg-amber-50 text-amber-700 border-amber-200 shadow-amber-200/60"
                : "bg-emerald-50 text-emerald-700 border-emerald-200/60"
            }`}
          >
            {hotkeyNotice}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Объявление #{adId}
          </h1>
          <p className="text-sm text-slate-500">
            Детали, характеристики, история модерации.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              prevNext.prevId &&
              navigate(`/item/${prevNext.prevId}`, { state: { from: backTo } })
            }
            disabled={!prevNext.prevId || allAdsQuery.isLoading}
            className="px-3 py-2 text-sm font-semibold transition-colors duration-200 border rounded-full border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600"
          >
            ← Предыдущее
          </button>
          <button
            onClick={() =>
              prevNext.nextId &&
              navigate(`/item/${prevNext.nextId}`, { state: { from: backTo } })
            }
            disabled={!prevNext.nextId || allAdsQuery.isLoading}
            className="px-3 py-2 text-sm font-semibold transition-colors duration-200 border rounded-full border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600"
          >
            Следующее →
          </button>
          <Link
            to={backTo}
            className="px-4 py-2 text-sm font-semibold transition-colors duration-200 border rounded-full border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600"
          >
            Назад к списку
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="p-6 bg-white border rounded-2xl border-slate-200 text-slate-500">
          Загружаем объявление…
        </div>
      )}

      {isError && (
        <div className="p-6 border rounded-2xl border-rose-200 bg-rose-50 text-rose-700">
          Не удалось загрузить объявление: {(error as Error).message}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              <div className="flex items-start justify-between gap-4 p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
                <div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={data.status}></StatusBadge>
                    <PriorityBadge priority={data.priority} />
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    {data.title}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Категория: {data.category} · создано{" "}
                    {formatDate(data.createdAt)}
                  </p>
                </div>
                <div className="text-2xl font-bold text-right text-slate-900">
                  {formatPrice(data.price)}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {imagesWithFallback(data.images).map((src, idx) => (
                  <div
                    key={idx}
                    className="overflow-hidden border rounded-2xl border-slate-200"
                  >
                    <img
                      src={src}
                      alt={`${data.title} ${idx + 1}`}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>

              <div className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">
                  Описание
                </h3>
                <p className="mt-2 text-slate-700">{data.description}</p>
              </div>

              <div className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">
                  Характеристики
                </h3>
                <div className="mt-3 text-sm divide-y divide-slate-100 text-slate-700">
                  {Object.entries(data.characteristics).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="text-slate-500">{key}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">
                  Продавец
                </h3>
                <p className="mt-2 text-sm text-slate-700">
                  {data.seller.name}
                </p>
                <p className="text-sm text-slate-500">
                  Рейтинг: {data.seller.rating}
                </p>
                <p className="text-sm text-slate-500">
                  Объявлений: {data.seller.totalAds}
                </p>
                <p className="text-sm text-slate-500">
                  На платформе с {formatDate(data.seller.registeredAt)}
                </p>
              </div>

              <div className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">
                  Панель модерации
                </h3>
                <div className="flex flex-col gap-2 mt-3">
                  <button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                    className="px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 shadow-sm rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Одобрить
                  </button>
                  <button
                    onClick={() => setActionMode("reject")}
                    className="px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 shadow-sm rounded-xl bg-rose-600 hover:bg-rose-700"
                  >
                    Отклонить
                  </button>
                  <button
                    onClick={() => setActionMode("requestChanges")}
                    className="px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 shadow-sm rounded-xl bg-amber-500 hover:bg-amber-600"
                  >
                    Вернуть на доработку
                  </button>
                </div>

                {actionMode !== "idle" && (
                  <div className="p-3 mt-3 space-y-2 border rounded-xl border-slate-200 bg-slate-50">
                    <div className="text-sm font-semibold text-slate-900">
                      {actionMode === "reject"
                        ? "Отклонение"
                        : "Вернуть на доработку"}
                    </div>
                    <select
                      className="w-full px-3 py-2 text-sm border rounded-lg outline-none border-slate-200 focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
                      value={reason}
                      onChange={(e) =>
                        setReason(e.target.value as ModerationReason)
                      }
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
                      className="w-full px-3 py-2 text-sm border rounded-lg outline-none border-slate-200 focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
                      rows={3}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setActionMode("idle")}
                        className="px-3 py-2 text-sm font-semibold border rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={() =>
                          actionMode === "reject"
                            ? rejectMutation.mutate()
                            : requestChangesMutation.mutate()
                        }
                        disabled={
                          rejectMutation.isPending ||
                          requestChangesMutation.isPending ||
                          !reason
                        }
                        className="px-4 py-2 text-sm font-semibold text-white transition shadow-sm rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 dark:text-slate-800 dark:hover:bg-slate-300 dark:bg-slate-100"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">
                  История модерации
                </h3>
                <div className="mt-3">
                  {data.moderationHistory.length ? (
                    <ModerationHistoryList history={data.moderationHistory} />
                  ) : (
                    <p className="text-sm text-slate-500">Истории пока нет.</p>
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
