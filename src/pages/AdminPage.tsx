import { useEffect, useState } from 'react';
import api from '../api/client';
import { Loader2, Users, Image, HardDrive, Activity } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { Navigate } from 'react-router-dom';

export default function AdminPage() {
  const user = useAuthStore(s => s.user);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const statCards = [
    { label: '用户数', value: stats?.userCount ?? 0, icon: Users, color: 'bg-blue-500/10 text-blue-500' },
    { label: '照片数', value: stats?.photoCount ?? 0, icon: Image, color: 'bg-green-500/10 text-green-500' },
    { label: '存储使用', value: stats?.storageUsed ? `${(stats.storageUsed / 1024 / 1024 / 1024).toFixed(2)} GB` : '0 GB', icon: HardDrive, color: 'bg-purple-500/10 text-purple-500' },
    { label: '今日活跃', value: stats?.activeToday ?? 0, icon: Activity, color: 'bg-orange-500/10 text-orange-500' },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">系统管理</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-surface-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {stats?.recentUsers && stats.recentUsers.length > 0 && (
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-medium">最近注册用户</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {stats.recentUsers.map((u: any) => (
              <div key={u.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
