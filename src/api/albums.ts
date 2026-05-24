import api from './client';

export const albumsApi = {
  list: () => api.get('/albums'),
  create: (data: { name: string; description?: string }) =>
    api.post('/albums', data),
  get: (id: string, params?: Record<string, any>) =>
    api.get(`/albums/${id}`, { params }),
  update: (id: string, data: Record<string, any>) =>
    api.put(`/albums/${id}`, data),
  delete: (id: string) => api.delete(`/albums/${id}`),
  addPhotos: (id: string, photoIds: string[]) =>
    api.post(`/albums/${id}/photos`, { photoIds }),
  removePhoto: (albumId: string, photoId: string) =>
    api.delete(`/albums/${albumId}/photos/${photoId}`),
};
