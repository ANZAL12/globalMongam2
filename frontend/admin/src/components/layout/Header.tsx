import logo from '../../assets/logo.png';
import { LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  userEmail?: string;
}

export function Header({ userEmail }: HeaderProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const isConfirmed = window.confirm("Are you sure you want to log out?");
    if (isConfirmed) {
      await supabase.auth.signOut();
      navigate('/login');
    }
  };

  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
      {/* Mobile menu button could go here */}
      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex items-center">
          <img src={logo} alt="Global Agencies" className="h-12 w-auto md:hidden" />
        </div>
        <div className="ml-4 flex items-center md:ml-6 gap-4">
          <span className="text-sm text-gray-500 hidden md:block">
            {userEmail || 'Admin User'}
          </span>
          <button
            onClick={handleLogout}
            className="p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            title="Log out"
          >
            <span className="sr-only">Log out</span>
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
