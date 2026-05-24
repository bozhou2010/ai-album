import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import {
  Home, Search, Image, Heart, Archive, Trash2, Share2, Map,
  Settings, Shield, Upload, FolderOpen, LogOut, Menu, ChevronLeft
} from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/search', icon: Search, label: '搜索' },
  { to: '/explore', icon: Image, label: '探索' },
  { to: '/upload', icon: Upload, label: '上传' },
  { to: '/album', icon: FolderOpen, label: '相册' },
  { to: '/favorites', icon: Heart, label: '收藏' },
  { to: '/archive', icon: Archive, label: '归档' },
  { to: '/sharing', icon: Share2, label: '分享' },
  { to: '/map', icon: Map, label: '地图' },
  { to: '/trash', icon: Trash2, label: '回收站' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-3 border-b border-gray-200 dark:border-gray-800">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <Image className="w-5 h-5 text-white" />
        </div>
        {sidebarOpen && <span className="font-display font-bold text-lg">AI Album</span>}
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-500/10 text-primary-500 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              } ${!sidebarOpen ? 'justify-center' : ''}`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-500/10 text-primary-500 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              } ${!sidebarOpen ? 'justify-center' : ''}`
            }
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>管理</span>}
          </NavLink>
        )}
      </nav>

      <div className="p-2 border-t border-gray-200 dark:border-gray-800">
        <NavLink
          to="/settings"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive
                ? 'bg-primary-500/10 text-primary-500 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            } ${!sidebarOpen ? 'justify-center' : ''}`
          }
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>设置</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>退出</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen">
      <aside
        className={`hidden lg:flex flex-col bg-white dark:bg-surface-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 ${
          sidebarOpen ? 'w-56' : 'w-16'
        }`}
      >
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-56 bg-white dark:bg-surface-900 z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center gap-3 px-4 bg-white dark:bg-surface-900 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:block p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 font-medium text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
