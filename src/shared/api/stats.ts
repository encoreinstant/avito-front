import { httpClient } from './client';
import type { ActivityData, DecisionsData, Period, StatsSummary } from '../types';

type StatsParams = {
  period?: Period;
  startDate?: string;
  endDate?: string;
};

function buildPeriodQuery(params: StatsParams) {
  const searchParams = new URLSearchParams();
  if (params.period) searchParams.set('period', params.period);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const statsApi = {
  summary: (params: StatsParams = {}, signal?: AbortSignal) =>
    httpClient.get<StatsSummary>(`/stats/summary${buildPeriodQuery(params)}`, { signal }),
  activity: (params: StatsParams = {}, signal?: AbortSignal) =>
    httpClient.get<ActivityData[]>(`/stats/chart/activity${buildPeriodQuery(params)}`, { signal }),
  decisions: (params: StatsParams = {}, signal?: AbortSignal) =>
    httpClient.get<DecisionsData>(`/stats/chart/decisions${buildPeriodQuery(params)}`, {
      signal,
    }),
  categories: (params: StatsParams = {}, signal?: AbortSignal) =>
    httpClient.get<Record<string, number>>(
      `/stats/chart/categories${buildPeriodQuery(params)}`,
      { signal },
    ),
};
