import { useParams } from 'react-router-dom';

export default function AlbumDetailPage() {
  const { id: _id } = useParams<{ id: string }>();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">相册详情</h1>
      <p className="text-gray-500">功能开发中...</p>
    </div>
  );
}
