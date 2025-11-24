import { httpClient } from './client';
import type { Moderator } from '../types';

// API для информации о текущем модераторе
export const moderatorApi = {
  // Получить профиль текущего модератора
  me: (signal?: AbortSignal) => httpClient.get<Moderator>('/moderators/me', { signal }),
};
