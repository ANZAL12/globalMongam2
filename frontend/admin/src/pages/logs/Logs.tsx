import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, RefreshCw, Search, Trash2 } from 'lucide-react';
import { cleanupOldLogs } from '../../utils/logger';
import { Pagination } from '../../components/Pagination';

type LogRow = {
  id?: string;
  created_at?: string;
  action?: string;
  details?: string;
  user_email?: string;
  [key: string]: any;
};

export function Logs() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      // Automatically purge logs older than 7 days when viewing the page
      await cleanupOldLogs();

      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setRows((data as LogRow[]) || []);
    } catch (e: any) {
      const msg =
        e?.message ||
        'Unable to load logs. Please check your database connection.';
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualCleanup = async () => {
    if (!window.confirm('Delete ALL system logs? This cannot be undone.')) return;
    
    setLoading(true);
    try {
      await cleanupOldLogs(true);
      await fetchLogs();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [rows, query]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, currentPage, rowsPerPage]);

  return (
    <div className="flex-1 flex flex-col space-y-6 min-h-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Logs</h1>
          <p className="mt-1 text-sm text-gray-500">Recent activity and system events.</p>
        </div>

        <div className="flex gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search logs..."
              className="pl-10 pr-3 py-2 w-72 max-w-[80vw] rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleManualCleanup}
            title="Delete all system logs"
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Trash2 className="w-4 h-4 mr-2 text-gray-500" />
            Cleanup
          </button>

          <button
            onClick={fetchLogs}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-amber-900">
          <div className="font-semibold">Couldn’t load logs</div>
          <div className="text-sm mt-1">{error}</div>
        </div>
      )}

      <div className="flex-1 bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden flex flex-col min-h-0">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
          <div className="text-sm font-semibold text-gray-900">
            System Events
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Updated on refresh
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[240px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No logs found.</div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <table className="w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-white sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="w-[20%] px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="w-[20%] px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="w-[40%] px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="w-[20%] px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {currentData.map((r, idx) => (
                  <tr key={String(r.id ?? `${r.created_at ?? 'row'}-${idx}`)} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate" title={r.created_at ? new Date(r.created_at).toLocaleString() : ''}>
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 truncate" title={r.action ?? ''}>
                      {r.action ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 truncate" title={r.details ?? ''}>
                      {r.details ?? '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate" title={r.user_email ?? ''}>
                      {r.user_email ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filtered.length}
            itemsPerPage={rowsPerPage}
          />
        )}
      </div>
    </div>

  );
}

