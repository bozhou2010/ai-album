import { useEffect, useState } from 'react';
import { photosApi } from '../api/photos';
import PhotoGrid from '../components/PhotoGrid';
import { Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { PhotoListItem } from '@shared/types';

export default function TrashPage() {
  const [photos, setPhotos] = useState<PhotoListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async () => {
    setLoading(true);
    try {
      const res = await photosApi.trash({ limit: 100 });
      setPhotos(res.data.photos);
      setTotal(res.data.total);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm('确定要清空回收站吗？此操作不可恢复。')) return;
    try {
      await photosApi.emptyTrash();
      toast.success('回收站已清空');
      setPhotos([]);
      setTotal(0);
    } catch {
      toast.error('清空回收站失败');
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
          <h1 className="font-display text-2xl font-bold">回收站</h1>
          <p className="text-gray-500 text-sm mt-1">{total} 张照片，30天后自动删除</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">已选择 {selectedIds.size} 张</span>
              <button onClick={clearSelection} className="text-sm text-primary-500 hover:underline">取消选择</button>
            </div>
          )}
          {total > 0 && (
            <button
              onClick={handleEmptyTrash}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              清空回收站
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">回收站为空</p>
          <p className="text-gray-400 text-sm mt-2">删除的照片会暂存在回收站中</p>
        </div>
      ) : (
        <PhotoGrid photos={photos} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
      )}
    </div>
  );
}
