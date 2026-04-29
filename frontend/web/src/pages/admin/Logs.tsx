import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface LogEntry {
    id: number;
    action_time: string;
    username: string; // Serializer populates this with the user.email
    content_type_id: number;
    object_id: string;
    object_repr: string;
    action_flag: number;
    change_message: string;
}

export default function Logs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('logs')
                .select('*')
                .order('action_time', { ascending: false });

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionType = (flag: number) => {
        switch (flag) {
            case 1: return <span className="text-green-600 bg-green-100 px-2 py-1 rounded">Addition</span>;
            case 2: return <span className="text-blue-600 bg-blue-100 px-2 py-1 rounded">Change</span>;
            case 3: return <span className="text-red-600 bg-red-100 px-2 py-1 rounded">Deletion</span>;
            default: return <span>Unknown</span>;
        }
    };

    if (loading) return <div>Loading logs...</div>;

    return (
        <div className="flex-1 bg-[#f5f5f5]">
            <div className="p-4 border-b bg-white">
                <h1 className="text-[20px] font-bold text-[#333]">Activity Logs</h1>
            </div>

            <div className="p-3 flex flex-col gap-3">
                {logs.length === 0 ? (
                    <div className="bg-white rounded-[12px] p-8 text-center shadow-sm border border-gray-100">
                        <div className="text-gray-400 mb-2">
                            <Activity size={40} className="mx-auto opacity-20" />
                        </div>
                        <p className="text-gray-500 font-medium">No activity logs found.</p>
                        <p className="text-xs text-gray-400 mt-1">Admin actions will appear here.</p>
                    </div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className="bg-white rounded-[12px] p-4 shadow-sm border border-gray-100 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <span className="text-[14px] font-bold text-[#333] truncate max-w-[200px]">
                                        {log.username}
                                    </span>
                                    <span className="text-[11px] text-[#8e8e93]">
                                        {new Date(log.action_time).toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-[12px]">
                                    {getActionType(log.action_flag)}
                                </div>
                            </div>

                            <div className="bg-[#f9f9f9] rounded-[8px] p-2 mt-1">
                                <div className="text-[12px] font-semibold text-[#555] mb-1">
                                    {log.object_repr}
                                </div>
                                <div className="text-[13px] text-[#666] leading-relaxed">
                                    {log.change_message || 'No details provided'}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
