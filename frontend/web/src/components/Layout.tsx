import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Users, Megaphone, List, PlusCircle, BellRing } from 'lucide-react';

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const role = localStorage.getItem('role');

    const onLogout = () => {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('role');
        navigate('/');
    };

    const navItems = role === 'admin'
        ? [
            { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
            { name: 'All Sales', path: '/admin/sales', icon: List },
            { name: 'Announcements', path: '/admin/announcements', icon: BellRing },
            { name: 'Promoters', path: '/admin/promoters', icon: Users }
        ]
        : role === 'promoter'
            ? [
                { name: 'Dashboard', path: '/promoter', icon: LayoutDashboard },
                { name: 'Upload Sale', path: '/promoter/add-sale', icon: PlusCircle },
                { name: 'My Sales', path: '/promoter/sales', icon: List },
                { name: 'Announcements', path: '/promoter/announcements', icon: Megaphone }
            ]
            : [];

    return (
        <div className="flex justify-center h-screen bg-[#f5f5f5]">
            {/* Main App Container enforcing a mobile aspect ratio on desktop */}
            <div className="w-full max-w-md bg-[#f5f5f5] h-full flex flex-col relative shadow-xl overflow-hidden border-x border-gray-200">

                {/* Mobile Header matching `headerShown: true` from expo-router */}
                <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
                    <h2 className="text-[18px] font-semibold text-[#1a1a1a]">Global Agencies</h2>
                    <button onClick={onLogout} className="p-2">
                        <LogOut size={24} color="#f00" />
                    </button>
                </header>

                {/* Main View Area */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>

                {/* Bottom Navigation matching `<Tabs>` */}
                <nav className="bg-white border-t border-gray-200 pb-safe z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-around items-center h-[60px] px-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            let isActive = false;

                            // Exact match for dashboard
                            if (item.path === '/admin' || item.path === '/promoter') {
                                isActive = location.pathname === item.path;
                            } else {
                                // Prefix match for sub-routes
                                isActive = location.pathname.startsWith(item.path);
                            }

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className="flex flex-col items-center justify-center w-full h-full gap-1 px-1 overflow-hidden"
                                >
                                    <Icon size={24} color={isActive ? '#1976d2' : '#8e8e93'} />
                                    <span className={`text-[10px] font-medium leading-tight text-center whitespace-nowrap overflow-hidden text-ellipsis w-full ${isActive ? 'text-[#1976d2]' : 'text-[#8e8e93]'}`}>
                                        {item.name}
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </nav>
            </div>
        </div>
    );
}
