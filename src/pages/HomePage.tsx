import { useEffect, useState } from 'react';
import { photosApi } from '../api/photos';
import { usePhotosStore } from '../stores/photos';
import PhotoGrid from '../components/PhotoGrid';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { photos, total, setPhotos, setLoading, loading, selectedIds, toggleSelect, clearSelection } = usePhotosStore();
  const [page, setPage] = useState(1);

  useEffect(() => {
    clearSelection();
    loadPhotos();
  }, [page]);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const res = await photosApi.list({ page, limit: 50 });
      setPhotos(res.data.photos, res.data.total);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">照片</h1>
          <p className="text-gray-500 text-sm mt-1">{total} 张照片</p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">已选择 {selectedIds.size} 张</span>
            <button onClick={clearSelection} className="text-sm text-primary-500 hover:underline">取消选择</button>
          </div>
        )}
      </div>

      {loading && photos.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">还没有照片</p>
          <p className="text-gray-400 text-sm mt-2">上传照片开始使用AI Album</p>
        </div>
      ) : (
        <>
          <PhotoGrid photos={photos} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
          {total > page * 50 && (
            <div className="text-center mt-6">
              <button onClick={() => setPage(p => p + 1)} className="px-6 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm">加载更多</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
