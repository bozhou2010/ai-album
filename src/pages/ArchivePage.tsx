import { useEffect, useState } from 'react';
import { photosApi } from '../api/photos';
import PhotoGrid from '../components/PhotoGrid';
import { Loader2 } from 'lucide-react';
import type { PhotoListItem } from '@shared/types';

export default function ArchivePage() {
  const [photos, setPhotos] = useState<PhotoListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadArchived();
  }, []);

  const loadArchived = async () => {
    setLoading(true);
    try {
      const res = await photosApi.list({ archived: true, limit: 100 });
      setPhotos(res.data.photos);
      setTotal(res.data.total);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">归档</h1>
          <p className="text-gray-500 text-sm mt-1">{total} 张归档照片</p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">已选择 {selectedIds.size} 张</span>
            <button onClick={clearSelection} className="text-sm text-primary-500 hover:underline">取消选择</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">没有归档照片</p>
          <p className="text-gray-400 text-sm mt-2">归档的照片不会出现在主时间线中</p>
        </div>
      ) : (
        <PhotoGrid photos={photos} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
      )}
    </div>
  );
}
