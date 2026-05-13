import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { syncWebPushToken } from '../../services/firebaseMessaging';
import { Bell, AlertTriangle } from 'lucide-react';

type Sale = {
    id: string;
    status: string;
};

export default function ApproverDashboard() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    useEffect(() => {
        setNotificationsEnabled(Notification.permission === 'granted');
    }, []);

    const handleTestNotification = () => {
        if (!('Notification' in window)) {
            alert('Notifications not supported');
            return;
        }
        if (Notification.permission !== 'granted') {
            alert('Please enable notifications first');
            return;
        }

        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('Test Notification', {
                body: 'Great! Your laptop is correctly receiving and showing notifications.',
                icon: '/logo.png',
                badge: '/favicon.png',
                tag: 'test-push'
            });
        });
    };

    const handleEnableNotifications = async () => {
        await syncWebPushToken();
        setNotificationsEnabled(Notification.permission === 'granted');
        if (Notification.permission === 'granted') {
            handleTestNotification();
        }
    };

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: promoters, error: promotersError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('role', 'promoter')
                    .eq('approver_id', user.id)
                    .eq('is_active', true);

                if (promotersError) throw promotersError;

                const promoterIds = (promoters || []).map((promoter: any) => promoter.id);
                if (promoterIds.length === 0) {
                    setSales([]);
                    return;
                }

                const { data, error } = await supabase
                    .from('sales')
                    .select('id, status')
                    .in('promoter_id', promoterIds);

                if (error) throw error;
                setSales(data || []);
            } catch (error) {
                console.error('Failed to fetch sales for approver dashboard', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSales();
    }, []);

    const totalCount = sales.length;
    const pendingCount = sales.filter((s) => s.status === 'pending').length;
    const approvedByYouCount = sales.filter((s) => s.status === 'approver_approved').length;
    const rejectedCount = sales.filter((s) => s.status === 'rejected').length;

    if (loading) {
        return (
            <div className="flex flex-1 justify-center items-center h-full">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-[20px] bg-[#f5f5f5]">
            <div className="flex justify-between items-center mb-[20px]">
                <h1 className="text-[24px] font-bold text-[#333]">Approver Overview</h1>
                {notificationsEnabled && (
                    <button 
                        onClick={handleTestNotification}
                        className="text-[14px] text-[#1976d2] hover:underline flex items-center gap-[5px]"
                    >
                        <Bell size={16} />
                        Test Notification
                    </button>
                )}
            </div>

            {!notificationsEnabled && (
                <div className="bg-orange-50 border border-orange-200 rounded-[15px] p-[20px] mb-[20px] flex items-center justify-between">
                    <div className="flex items-center gap-[15px]">
                        <div className="bg-orange-100 p-[10px] rounded-full">
                            <AlertTriangle className="text-orange-600" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-orange-900">Notifications Disabled</h3>
                            <p className="text-orange-700 text-sm">Enable notifications to receive alerts for new sales pending approval.</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleEnableNotifications}
                        className="bg-orange-600 text-white px-[20px] py-[10px] rounded-[10px] font-bold flex items-center gap-[8px] hover:bg-orange-700 transition-colors"
                    >
                        <Bell size={18} />
                        Enable Now
                    </button>
                </div>
            )}

            <div className="flex flex-col gap-[15px]">
                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#1976d2]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Assigned Sales</h2>
                    <p className="text-[28px] font-bold text-[#333]">{totalCount}</p>
                </div>

                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#ff9800]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Pending Review</h2>
                    <p className="text-[28px] font-bold text-[#333]">{pendingCount}</p>
                </div>

                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#4caf50]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Approved by You</h2>
                    <p className="text-[28px] font-bold text-[#333]">{approvedByYouCount}</p>
                </div>

                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#f44336]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Rejected</h2>
                    <p className="text-[28px] font-bold text-[#333]">{rejectedCount}</p>
                </div>
            </div>
        </div>
    );
}
