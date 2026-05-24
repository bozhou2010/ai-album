import api from './client';

export const searchApi = {
  search: (params: { q: string; mode?: string; limit?: number }) =>
    api.get('/search', { params }),
  history: () => api.get('/search/history'),
  deleteHistory: () => api.delete('/search/history'),
};
