import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success('重置邮件已发送');
    } catch {
      toast.error('发送失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl font-bold text-center mb-8">忘记密码</h1>
        {sent ? (
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-800 text-center">
            <p className="text-gray-600 dark:text-gray-400">如果该邮箱已注册，重置邮件已发送。</p>
            <Link to="/login" className="text-primary-500 hover:underline mt-4 inline-block">返回登录</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-900 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">邮箱</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" required />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50">{loading ? '发送中...' : '发送重置链接'}</button>
            <div className="mt-4 text-center"><Link to="/login" className="text-primary-500 hover:underline text-sm">返回登录</Link></div>
          </form>
        )}
      </div>
    </div>
  );
}
