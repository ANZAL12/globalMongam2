import logo from '../../assets/logo.png';
import { Link, useLocation } from 'react-router-dom';
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

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-0 overflow-y-auto bg-white border-r border-gray-200 shadow-xl shadow-gray-100/50">
        <div className="flex items-center flex-shrink-0 px-4 mb-0 -mt-12 transform -translate-x-1 pointer-events-none">
          <img src={logo} alt="Global Agencies" className="h-60 w-auto" />
        </div>
        <div className="mt-[-90px] flex-grow flex flex-col relative z-20">
          <nav className="flex-1 px-2 pb-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                              (item.href !== '/' && location.pathname.startsWith(item.href));
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${isActive 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon
                    className={`
                      mr-3 flex-shrink-0 h-6 w-6
                      ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
