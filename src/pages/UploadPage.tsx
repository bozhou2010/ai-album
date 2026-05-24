import { useState, useRef } from 'react';
import { photosApi } from '../api/photos';
import { Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [_progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...dropped]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    try {
      const res = await photosApi.upload(formData);
      const { photos, skippedDuplicates } = res.data;
      toast.success(`上传成功 ${photos.length} 张照片`);
      if (skippedDuplicates?.length > 0) {
        toast(`${skippedDuplicates.length} 张重复照片已跳过`, { icon: '⚠️' });
      }
      setFiles([]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">上传照片</h1>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-12 text-center cursor-pointer hover:border-primary-500 transition-colors"
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium">拖拽照片到此处，或点击选择</p>
        <p className="text-gray-400 text-sm mt-2">支持 JPG、PNG、WebP、HEIC、MP4，单文件最大200MB</p>
        <input ref={inputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => { const f = Array.from(e.target.files || []); setFiles(prev => [...prev, ...f]); }} />
      </div>

      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">{files.length} 个文件待上传</span>
            <div className="flex gap-2">
              <button onClick={() => setFiles([])} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">清空</button>
              <button onClick={handleUpload} disabled={uploading} className="px-6 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50">
                {uploading ? '上传中...' : '开始上传'}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-white dark:bg-surface-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <span className="text-sm truncate flex-1">{f.name}</span>
                <span className="text-xs text-gray-400">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
