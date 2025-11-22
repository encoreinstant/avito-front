export type AdStatus = 'pending' | 'approved' | 'rejected' | 'draft';
export type Priority = 'normal' | 'urgent';
export type ModerationAction = 'approved' | 'rejected' | 'requestChanges';

export type SortBy = 'createdAt' | 'price' | 'priority';
export type SortOrder = 'asc' | 'desc';

export interface Seller {
  id: number;
  name: string;
  rating: string;
  registeredAt: string;
  totalAds: number;
}

export interface ModerationHistory {
  id: number;
  action: ModerationAction;
  comment?: string;
  reason?: string | null;
  moderatorId: number;
  moderatorName: string;
  timestamp: string;
}

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

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface AdsListResponse {
  ads: Advertisement[];
  pagination: Pagination;
}

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

export interface ActivityData {
  date: string;
  approved: number;
  rejected: number;
  requestChanges: number;
}

export interface DecisionsData {
  approved: number;
  rejected: number;
  requestChanges: number;
}

export interface ModeratorStats {
  approvalRate: number;
  averageReviewTime: number;
  todayReviewed: number;
  thisWeekReviewed: number;
  thisMonthReviewed: number;
  totalReviewed: number;
}

export interface Moderator {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  statistics: ModeratorStats;
}

export type Period = 'today' | 'week' | 'month' | 'custom';
