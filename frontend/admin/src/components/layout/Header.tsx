import logo from '../../assets/logo.png';
import { LogOut, RefreshCw, Moon, Sun } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../../context/ModalContext';
import { useEffect, useState } from 'react';

interface HeaderProps {
  userEmail?: string;
}

export function Header({ userEmail }: HeaderProps) {
  const navigate = useNavigate();
  const { showConfirm } = useModal();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('admin-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme ? savedTheme === 'dark' : prefersDark;

    setIsDarkMode(shouldUseDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }, []);

  const handleLogout = async () => {
    const isConfirmed = await showConfirm({
      title: 'Sign out',
      message: 'Are you sure you want to sign out of the admin dashboard?',
      severity: 'warning',
    });
    if (isConfirmed) {
      await supabase.auth.signOut();
      navigate('/login');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleToggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('admin-theme', next ? 'dark' : 'light');
  };

  return (
    <div className="relative z-10 shrink-0 flex h-16 bg-white shadow">
      {/* Mobile menu button could go here */}
      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex items-center">
          <img src={logo} alt="Global Agencies" className="h-12 w-auto md:hidden" />
        </div>
        <div className="ml-4 flex items-center md:ml-6 gap-4">
          <button
            onClick={handleToggleTheme}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all"
            title="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="text-xs font-semibold hidden md:inline">
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
          <span className="text-sm text-gray-500 hidden md:block">
            {userEmail || 'Administrator'}
          </span>
          <button
            onClick={handleRefresh}
            className="p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            title="Refresh page"
          >
            <span className="sr-only">Refresh page</span>
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            onClick={handleLogout}
            className="p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            title="Sign out"
          >
            <span className="sr-only">Sign out</span>
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
