import { useEffect, useState } from 'react';

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
        setLoading(false);
        // Supabase does not have a native admin log equivalent out-of-the-box like Django.
        // It requires custom postgres triggers or viewing the Supabase Dashboard.
        setLogs([]);
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
        <div className="p-4">
            <h1 className="text-2xl flex font-bold mb-4">Admin Activity Logs</h1>
            <div className="overflow-x-auto">
                <table className="w-full bg-white shadow-md rounded border">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-3 text-left">Time</th>
                            <th className="p-3 text-left">Admin Email / UID</th>
                            <th className="p-3 text-left">Action Type</th>
                            <th className="p-3 text-left">Object</th>
                            <th className="p-3 text-left">Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id} className="border-b hover:bg-gray-50">
                                <td className="p-3">{new Date(log.action_time).toLocaleString()}</td>
                                <td className="p-3 font-semibold">{log.username}</td>
                                <td className="p-3">{getActionType(log.action_flag)}</td>
                                <td className="p-3">{log.object_repr}</td>
                                <td className="p-3">{log.change_message || 'N/A'}</td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-4 text-center text-gray-500">No activity logs found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
