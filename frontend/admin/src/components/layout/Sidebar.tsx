import logo from '../../assets/logo.png';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  Megaphone, 
  FileText,
  UserCog,
  Image,
  ShieldCheck
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Approvers', href: '/approvers', icon: ShieldCheck },
  { name: 'Promoters', href: '/promoters', icon: Users },
  { name: 'Manage Promoters', href: '/promoters/manage', icon: UserCog },
  { name: 'Sales', href: '/sales', icon: ShoppingBag },
  { name: 'Announcements', href: '/announcements', icon: Megaphone },
  { name: 'Logs', href: '/logs', icon: FileText },
  { name: 'Media Library', href: '/media', icon: Image },
];

export function Sidebar() {
  const location = useLocation();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const { count } = await supabase
          .from('promoter_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingRequestsCount(count || 0);
      } catch (e) {
        console.error('Failed to fetch pending promoter requests count', e);
      }
    }

    fetchPendingCount();

    const channel = supabase
      .channel('promoter-requests-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'promoter_requests' },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col grow pt-0 overflow-y-auto bg-white border-r border-gray-200 shadow-xl shadow-gray-100/50">
        <div className="flex items-center shrink-0 px-4 mb-0 -mt-12 transform -translate-x-1 pointer-events-none">
          <img src={logo} alt="Global Agencies" className="h-60 w-auto" />
        </div>
        <div className="mt-[-90px] grow flex flex-col relative z-20">
          <nav className="flex-1 px-2 pb-4 space-y-1">
            {navigation.map((item) => {
              const isActive =
                item.href === '/'
                  ? location.pathname === '/'
                  : item.href === '/promoters'
                  ? location.pathname === '/promoters' || location.pathname.startsWith('/promoters/')
                  : item.href === '/promoters/manage'
                  ? location.pathname === '/promoters/manage'
                  : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md
                    ${isActive 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <span className="flex items-center min-w-0">
                    <Icon
                      className={`
                        mr-3 shrink-0 h-6 w-6
                        ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}
                      `}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  {item.href === '/promoters' && pendingRequestsCount > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold ml-2 animate-pulse shadow-sm shadow-rose-500/50 ring-2 ring-rose-500/30">
                      {pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
