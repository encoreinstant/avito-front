import { httpClient } from './client';
import type { ActivityData, DecisionsData, Period, StatsSummary } from '../types';

// Параметры для выборки статистики (период или явные даты)
type StatsParams = {
  period?: Period;
  startDate?: string;
  endDate?: string;
};

// Собираем query-string для запросов статистики
function buildPeriodQuery(params: StatsParams) {
  const searchParams = new URLSearchParams();
  if (params.period) searchParams.set('period', params.period);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// API-обёртка для различных зрезов статистики
export const statsApi = {
  // Сводка по решениям и времени проверки
  summary: (params: StatsParams = {}, signal?: AbortSignal) =>
    httpClient.get<StatsSummary>(`/stats/summary${buildPeriodQuery(params)}`, { signal }),
  // Данные для графика активности
  activity: (params: StatsParams = {}, signal?: AbortSignal) =>
    httpClient.get<ActivityData[]>(`/stats/chart/activity${buildPeriodQuery(params)}`, { signal }),
  // Распределение решений по статусам
  decisions: (params: StatsParams = {}, signal?: AbortSignal) =>
    httpClient.get<DecisionsData>(`/stats/chart/decisions${buildPeriodQuery(params)}`, {
      signal,
    }),
  // Количество проверок по категориям
  categories: (params: StatsParams = {}, signal?: AbortSignal) =>
    httpClient.get<Record<string, number>>(
      `/stats/chart/categories${buildPeriodQuery(params)}`,
      { signal },
    ),
};
