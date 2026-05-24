import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import type { PhotoListItem } from '@shared/types';

interface PhotoGridProps {
  photos: PhotoListItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export default function PhotoGrid({ photos, selectedIds, onToggleSelect }: PhotoGridProps) {
  const navigate = useNavigate();

  return (
    <div className="photo-grid">
      {photos.map((photo) => {
        const isSelected = selectedIds.has(photo.id);
        return (
          <div
            key={photo.id}
            className="relative group cursor-pointer aspect-square bg-gray-200 dark:bg-gray-800 overflow-hidden rounded"
            onClick={() => {
              if (selectedIds.size > 0) {
                onToggleSelect(photo.id);
              } else {
                navigate(`/photo/${photo.id}`);
              }
            }}
          >
            {photo.thumbnailPath ? (
              <img
                src={`/thumbnails/${photo.thumbnailPath.split(/[\\/]/).slice(-3).join('/')}`}
                alt={photo.originalName}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-xs">{photo.processingStatus}</span>
              </div>
            )}

            {photo.fileType === 'video' && (
              <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                VIDEO
              </div>
            )}

            {photo.isFavorite && (
              <div className="absolute top-1 left-1 text-red-500">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
            )}

            <div
              className={`absolute top-1 right-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-opacity ${
                isSelected
                  ? 'bg-primary-500 border-primary-500 opacity-100'
                  : 'bg-black/30 border-white opacity-0 group-hover:opacity-100'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(photo.id);
              }}
            >
              {isSelected && <Check className="w-4 h-4 text-white" />}
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-xs truncate">{photo.originalName}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
