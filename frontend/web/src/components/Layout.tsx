import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Users, Megaphone, List, PlusCircle, BellRing, Activity } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const role = localStorage.getItem('role');

    const onLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('access');
        localStorage.removeItem('role');
        navigate('/');
    };

    const navItems = role === 'admin'
        ? [
            { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
            { name: 'Payouts', path: '/admin/sales', icon: List },
            { name: 'New Announcement', path: '/admin/announcements', icon: BellRing },
            { name: 'Promoters', path: '/admin/promoters', icon: Users },
            { name: 'Logs', path: '/admin/logs', icon: Activity }
        ]
        : role === 'approver'
            ? [
                { name: 'Dashboard', path: '/approver', icon: LayoutDashboard },
                { name: 'Review Sales', path: '/approver/sales', icon: List },
                { name: 'Add Promoter', path: '/approver/add-promoter', icon: PlusCircle }
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
        <div className="flex justify-center h-[100dvh] overflow-hidden bg-[#f5f5f5]">
            {/* Main App Container enforcing a mobile aspect ratio on desktop */}
            <div className="w-full max-w-md bg-[#f5f5f5] h-full min-h-0 flex flex-col relative shadow-xl overflow-hidden border-x border-gray-200">

                {/* Mobile Header matching `headerShown: true` from expo-router */}
                <header className="flex shrink-0 items-center justify-between px-4 h-20 bg-white border-b border-gray-200 shadow-sm">
                    <div className="relative h-20 w-48 overflow-hidden">
                        <img src="/logo.png" alt="Global Agencies Logo" className="absolute left-[0px] top-[65%] -translate-y-1/2 h-20 scale-[2.2] object-contain origin-left" />
                    </div>
                    <button onClick={onLogout} className="p-2">
                        <LogOut size={24} color="#f00" />
                    </button>
                </header>

                {/* Main View Area */}
                <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                    <Outlet />
                </main>

                {/* Bottom Navigation matching `<Tabs>` */}
                <nav className="shrink-0 bg-white border-t border-gray-200 pb-safe z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-around items-center h-[60px] px-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            let isActive = false;

                            // Exact match for dashboard
                            if (item.path === '/admin' || item.path === '/promoter' || item.path === '/approver') {
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
