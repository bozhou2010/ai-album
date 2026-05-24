import React, { useState } from 'react';
import { searchApi } from '../api/search';
import PhotoGrid from '../components/PhotoGrid';
import { Search, Loader2 } from 'lucide-react';
import type { PhotoListItem } from '@shared/types';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PhotoListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const selectedIds = new Set<string>();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchApi.search({ q: query, mode: 'smart' });
      setResults(res.data.results.map((r: any) => r.photo));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">搜索</h1>
      <form onSubmit={handleSearch} className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索照片、OCR文字、人物..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-surface-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        />
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : searched && results.length === 0 ? (
        <div className="text-center py-20"><p className="text-gray-500">未找到相关照片</p></div>
      ) : results.length > 0 ? (
        <PhotoGrid photos={results} selectedIds={selectedIds} onToggleSelect={() => {}} />
      ) : null}
    </div>
  );
}
