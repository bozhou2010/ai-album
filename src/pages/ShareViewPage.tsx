import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import { Loader2 } from 'lucide-react';

export default function ShareViewPage() {
  const { token } = useParams<{ token: string }>();
  const [share, setShare] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadShare();
  }, [token]);

  const loadShare = async () => {
    try {
      const res = await api.get(`/share/${token}`);
      setShare(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '分享链接无效或已过期');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-medium text-gray-700 dark:text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-2">{share?.album?.name || '分享相册'}</h1>
        {share?.album?.description && <p className="text-gray-500 mb-6">{share.album.description}</p>}
        <div className="photo-grid">
          {share?.photos?.map((photo: any) => (
            <div key={photo.id} className="relative aspect-square bg-gray-200 dark:bg-gray-800 overflow-hidden rounded">
              {photo.thumbnailPath ? (
                <img
                  src={`/thumbnails/${photo.thumbnailPath.split(/[\\/]/).slice(-3).join('/')}`}
                  alt={photo.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">加载中</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
