import { httpClient } from './client';
import type {
  AdStatus,
  AdsListResponse,
  Advertisement,
  Period,
  SortBy,
  SortOrder,
} from '../types';

export const MODERATION_REASONS = [
  'Запрещенный товар',
  'Неверная категория',
  'Некорректное описание',
  'Проблемы с фото',
  'Подозрение на мошенничество',
  'Другое',
] as const;

export type ModerationReason = (typeof MODERATION_REASONS)[number];

export interface AdsQueryParams {
  page?: number;
  limit?: number;
  status?: AdStatus[];
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
}

export function buildQueryString(params: AdsQueryParams) {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.status?.length) {
    params.status.forEach((s) => searchParams.append('status', s));
  }
  if (params.categoryId !== undefined && params.categoryId !== null) {
    searchParams.set('categoryId', String(params.categoryId));
  }
  if (params.minPrice !== undefined) searchParams.set('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) searchParams.set('maxPrice', String(params.maxPrice));
  if (params.search) searchParams.set('search', params.search);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const adsApi = {
  list: async (params: AdsQueryParams, signal?: AbortSignal) => {
    const res = await httpClient.get<AdsListResponse>(`/ads${buildQueryString(params)}`, {
      signal,
    });
    return {
      ...res,
      ads: res.ads.map(normalizeAd),
    };
  },
  get: async (id: number, signal?: AbortSignal) => {
    const ad = await httpClient.get<Advertisement>(`/ads/${id}`, { signal });
    return normalizeAd(ad);
  },
  approve: (id: number, signal?: AbortSignal) =>
    httpClient.post<{ message: string; ad: Advertisement }>(`/ads/${id}/approve`, undefined, {
      signal,
    }),
  reject: (
    id: number,
    payload: { reason: ModerationReason; comment?: string },
    signal?: AbortSignal,
  ) =>
    httpClient.post<{ message: string; ad: Advertisement }>(`/ads/${id}/reject`, payload, {
      signal,
    }),
  requestChanges: (
    id: number,
    payload: { reason: ModerationReason; comment?: string },
    signal?: AbortSignal,
  ) =>
    httpClient.post<{ message: string; ad: Advertisement }>(
      `/ads/${id}/request-changes`,
      payload,
      { signal },
    ),
};

function normalizeAd(ad: Advertisement): Advertisement {
  // Сервер ставит draft при возврате на доработку, считаем его "pending"
  const normalizedStatus: AdStatus = ad.status === 'draft' ? 'pending' : ad.status;
  return { ...ad, status: normalizedStatus };
}
