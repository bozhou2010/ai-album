import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { photosApi } from '../api/photos';
import { Loader2, ArrowLeft, Heart, Archive, Trash2, Download, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PhotoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (id) loadPhoto();
  }, [id]);

  const loadPhoto = async () => {
    setLoading(true);
    try {
      const res = await photosApi.get(id!);
      setPhoto(res.data);
    } catch {
      toast.error('加载照片失败');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async () => {
    try {
      await photosApi.favorite(id!, !photo.isFavorite);
      setPhoto({ ...photo, isFavorite: !photo.isFavorite });
      toast.success(photo.isFavorite ? '已取消收藏' : '已收藏');
    } catch {
      toast.error('操作失败');
    }
  };

  const handleArchive = async () => {
    try {
      await photosApi.archive(id!, !photo.isArchived);
      setPhoto({ ...photo, isArchived: !photo.isArchived });
      toast.success(photo.isArchived ? '已取消归档' : '已归档');
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这张照片吗？')) return;
    try {
      await photosApi.delete(id!);
      toast.success('已移至回收站');
      navigate(-1);
    } catch {
      toast.error('删除失败');
    }
  };

  const handleDownload = async () => {
    try {
      const res = await photosApi.download(id!);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.originalName || 'photo';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('下载失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!photo) return null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="flex-1 flex items-center justify-center bg-black/5 dark:bg-black/20 rounded-xl overflow-hidden">
        {photo.fileType === 'video' ? (
          <video src={`/photos/${id}/file`} controls className="max-w-full max-h-[70vh]" />
        ) : (
          <img src={`/photos/${id}/file`} alt={photo.originalName} className="max-w-full max-h-[70vh] object-contain" />
        )}
      </div>

      <div className="lg:w-80 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button onClick={handleFavorite} className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${photo.isFavorite ? 'text-red-500' : ''}`}>
            <Heart className={`w-5 h-5 ${photo.isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button onClick={handleArchive} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <Archive className="w-5 h-5" />
          </button>
          <button onClick={handleDownload} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <Info className="w-5 h-5" />
          </button>
          <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-red-500">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="font-medium text-lg truncate">{photo.originalName}</h2>
            {photo.description && <p className="text-gray-500 text-sm mt-1">{photo.description}</p>}
          </div>

          {showInfo && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3 text-sm">
              {photo.width && photo.height && (
                <div className="flex justify-between">
                  <span className="text-gray-500">尺寸</span>
                  <span>{photo.width} × {photo.height}</span>
                </div>
              )}
              {photo.fileSize && (
                <div className="flex justify-between">
                  <span className="text-gray-500">大小</span>
                  <span>{(photo.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              )}
              {photo.mimeType && (
                <div className="flex justify-between">
                  <span className="text-gray-500">类型</span>
                  <span>{photo.mimeType}</span>
                </div>
              )}
              {photo.takenAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">拍摄时间</span>
                  <span>{new Date(photo.takenAt).toLocaleString()}</span>
                </div>
              )}
              {photo.cameraModel && (
                <div className="flex justify-between">
                  <span className="text-gray-500">相机</span>
                  <span>{photo.cameraModel}</span>
                </div>
              )}
              {photo.location && photo.location.name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">位置</span>
                  <span>{photo.location.name}</span>
                </div>
              )}
              {photo.aiDescription && (
                <div>
                  <span className="text-gray-500">AI 描述</span>
                  <p className="mt-1">{photo.aiDescription}</p>
                </div>
              )}
              {photo.tags && photo.tags.length > 0 && (
                <div>
                  <span className="text-gray-500">标签</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {photo.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 bg-primary-500/10 text-primary-500 rounded text-xs">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
