import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      toast.success('密码重置成功');
      navigate('/login');
    } catch {
      toast.error('重置失败，链接可能已过期');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return <div className="min-h-screen flex items-center justify-center"><p>无效的重置链接</p></div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-800">
        <h1 className="font-display text-2xl font-bold text-center mb-6">重置密码</h1>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1.5">新密码</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" required minLength={8} />
        </div>
        <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50">{loading ? '重置中...' : '重置密码'}</button>
      </form>
    </div>
  );
}
