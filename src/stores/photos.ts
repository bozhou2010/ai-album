import { create } from 'zustand';
import type { PhotoListItem } from '@shared/types';

interface PhotosState {
  photos: PhotoListItem[];
  total: number;
  page: number;
  loading: boolean;
  selectedIds: Set<string>;
  setPhotos: (photos: PhotoListItem[], total: number) => void;
  setLoading: (loading: boolean) => void;
  setPage: (page: number) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
}

export const usePhotosStore = create<PhotosState>()((set, get) => ({
  photos: [],
  total: 0,
  page: 1,
  loading: false,
  selectedIds: new Set(),
  setPhotos: (photos, total) => set({ photos, total }),
  setLoading: (loading) => set({ loading }),
  setPage: (page) => set({ page }),
  toggleSelect: (id) => {
    const selected = new Set(get().selectedIds);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    set({ selectedIds: selected });
  },
  clearSelection: () => set({ selectedIds: new Set() }),
  selectAll: () => {
    const ids = new Set(get().photos.map(p => p.id));
    set({ selectedIds: ids });
  },
}));
