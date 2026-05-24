import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { authApi } from '../api/auth';
import { Image } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.register({ email, password, name });
      setAuth(res.data.token, res.data.user);
      toast.success('注册成功');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Image className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold">创建账号</h1>
          <p className="text-gray-500 mt-2">开始使用AI Album管理你的照片</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-900 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">姓名</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">邮箱</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">密码</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" required minLength={8} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-6 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors">
            {loading ? '注册中...' : '注册'}
          </button>

          <div className="mt-6 text-center text-sm text-gray-500">
            已有账号？{' '}
            <Link to="/login" className="text-primary-500 hover:underline font-medium">登录</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
