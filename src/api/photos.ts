import api from './client';

export const photosApi = {
  list: (params?: Record<string, any>) => api.get('/photos', { params }),
  get: (id: string) => api.get(`/photos/${id}`),
  upload: (formData: FormData) =>
    api.post('/photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
    }),
  delete: (id: string) => api.delete(`/photos/${id}`),
  permanentDelete: (id: string) => api.delete(`/photos/${id}/permanent`),
  restore: (id: string) => api.post(`/photos/${id}/restore`),
  favorite: (id: string, isFavorite: boolean) =>
    api.put(`/photos/${id}/favorite`, { isFavorite }),
  archive: (id: string, isArchived: boolean) =>
    api.put(`/photos/${id}/archive`, { isArchived }),
  download: (id: string) =>
    api.get(`/photos/${id}/download`, { responseType: 'blob' }),
  status: (id: string) => api.get(`/photos/${id}/status`),
  batch: (data: { photoIds: string[]; action: string; albumId?: string }) =>
    api.post('/photos/batch', data),
  batchDownload: (data: { photoIds: string[]; size?: string }) =>
    api.post('/photos/batch-download', data, { responseType: 'blob' }),
  favorites: (params?: Record<string, any>) =>
    api.get('/photos/favorites/list', { params }),
  trash: (params?: Record<string, any>) =>
    api.get('/photos/trash/list', { params }),
  emptyTrash: () => api.delete('/photos/trash/empty'),
};
