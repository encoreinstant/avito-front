// Статусы объявления (draft приходит с сервера, мы конвертируем его в pending на клиенте)
export type AdStatus = 'pending' | 'approved' | 'rejected' | 'draft';
// Приоритет объявления
export type Priority = 'normal' | 'urgent';
// Действия модерации для истории
export type ModerationAction = 'approved' | 'rejected' | 'requestChanges';

// Поля сортировки и направление
export type SortBy = 'createdAt' | 'price' | 'priority';
export type SortOrder = 'asc' | 'desc';

// Продавец
export interface Seller {
  id: number;
  name: string;
  rating: string;
  registeredAt: string;
  totalAds: number;
}

// Запись истории модерации
export interface ModerationHistory {
  id: number;
  action: ModerationAction;
  comment?: string;
  reason?: string | null;
  moderatorId: number;
  moderatorName: string;
  timestamp: string;
}

// Основная модель объявления
export interface Advertisement {
  id: number;
  title: string;
  price: number;
  category: string;
  categoryId: number;
  description: string;
  images: string[];
  status: AdStatus;
  priority: Priority;
  seller: Seller;
  characteristics: Record<string, string>;
  moderationHistory: ModerationHistory[];
  createdAt: string;
  updatedAt: string;
}

// Пагинация ответа списка
export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

// Ответ списка объявлений
export interface AdsListResponse {
  ads: Advertisement[];
  pagination: Pagination;
}

// Сводка по модерации для /stats
export interface StatsSummary {
  totalReviewed: number;
  totalReviewedToday: number;
  totalReviewedThisWeek: number;
  totalReviewedThisMonth: number;
  approvedPercentage: number;
  rejectedPercentage: number;
  requestChangesPercentage: number;
  averageReviewTime: number;
}

// Точки данных активности по дням
export interface ActivityData {
  date: string;
  approved: number;
  rejected: number;
  requestChanges: number;
}

// Распределение решений по статусам
export interface DecisionsData {
  approved: number;
  rejected: number;
  requestChanges: number;
}

// Метрики модератора
export interface ModeratorStats {
  approvalRate: number;
  averageReviewTime: number;
  todayReviewed: number;
  thisWeekReviewed: number;
  thisMonthReviewed: number;
  totalReviewed: number;
}

// Профиль модератора
export interface Moderator {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  statistics: ModeratorStats;
}

// Периоды для статистики
export type Period = 'today' | 'week' | 'month' | 'custom';
