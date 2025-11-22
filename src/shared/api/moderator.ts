import { httpClient } from './client';
import type { Moderator } from '../types';

export const moderatorApi = {
  me: (signal?: AbortSignal) => httpClient.get<Moderator>('/moderators/me', { signal }),
};
