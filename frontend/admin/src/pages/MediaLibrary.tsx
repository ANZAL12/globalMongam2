import { useState, useEffect } from 'react';
import { 
  Trash2, 
  Calendar, 
  RefreshCw, 
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Clock,
  HardDrive,
  Skull
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
  interface Window {
    electron: {
      cloudinary: {
        listAssets: (options?: any) => Promise<any>;
        deleteAssets: (publicIds: string[]) => Promise<any>;
        deleteByDate: (dateRange: { startDate: string; endDate: string }) => Promise<any>;
        deleteAll: () => Promise<any>;
        getUsage: () => Promise<any>;
      }
    }
  }
}

interface CloudinaryAsset {
  public_id: string;
  format: string;
  version: number;
  resource_type: string;
  type: string;
  created_at: string;
  bytes: number;
  width: number;
  height: number;
  url: string;
  secure_url: string;
}

export function MediaLibrary() {
  const [assets, setAssets] = useState<CloudinaryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  
  // Stats State
  const [usageStats, setUsageStats] = useState<any>(null);

  // Debug State
  const [showDebug, setShowDebug] = useState(false);
  const [rawUsage, setRawUsage] = useState<any>(null);
  const [rawAssets, setRawAssets] = useState<any>(null);
  // Nuke Modal State
  const [isNukeModalOpen, setIsNukeModalOpen] = useState(false);
  const [nukeConfirmText, setNukeConfirmText] = useState('');
  const NUKE_PHRASE = 'NUKE-ALL-DATA';

  // Bulk Delete State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ count: number; success: boolean } | null>(null);

  const fetchAssets = async (cursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!window.electron?.cloudinary) {
        throw new Error(
          'Media Library runs inside the Admin desktop app (Electron), not in a regular browser tab. ' +
          'From the frontend/admin folder, run: npm run electron:dev'
        );
      }

      const response = await window.electron.cloudinary.listAssets({
        max_results: 50,
        next_cursor: cursor
      });

      if (response.success) {
        setRawAssets(response.data);
        if (cursor) {
          setAssets(prev => [...prev, ...response.data.resources]);
        } else {
          setAssets(response.data.resources);
        }
        setNextCursor(response.data.next_cursor || null);
        
        // Also fetch usage stats
        fetchUsage();
      } else {
        setError(response.error || 'Failed to fetch assets');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsage = async () => {
    try {
      console.log('Invoking cloudinary:getUsage...');
      const response = await window.electron.cloudinary.getUsage();
      setRawUsage(response);
      if (response.success) {
        setUsageStats(response.data);
      } else {
        console.error('Usage fetch failed:', response.error);
      }
    } catch (err) {
      console.error('Failed to invoke getUsage', err);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleDeleteSingle = async (publicId: string) => {
    if (!confirm('Are you sure you want to delete this asset? This action cannot be undone.')) return;

    try {
      const response = await window.electron.cloudinary.deleteAssets([publicId]);
      if (response.success) {
        setAssets(prev => prev.filter(a => a.public_id !== publicId));
        fetchUsage();
      } else {
        alert('Delete failed: ' + response.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }

    if (!confirm(`WARNING: This will permanently delete ALL uploads between ${startDate} and ${endDate}. Are you absolutely sure?`)) {
      return;
    }

    setBulkDeleting(true);
    setBulkResult(null);
    setError(null); // Clear previous errors
    try {
      console.log('Invoking bulk delete for range:', { startDate, endDate });
      const response = await window.electron.cloudinary.deleteByDate({ startDate, endDate });
      if (response.success) {
        setBulkResult({ count: response.deletedCount || 0, success: true });
        fetchAssets(); // Refresh everything
      } else {
        setError(response.error || 'Bulk delete failed');
      }
    } catch (err: any) {
      setError(err.message || 'Bulk delete error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleNukeAll = async () => {
    if (nukeConfirmText !== NUKE_PHRASE) return;

    setLoading(true);
    setIsNukeModalOpen(false);
    try {
      const response = await window.electron.cloudinary.deleteAll();
      if (response.success) {
        alert('All assets have been successfully deleted.');
        setAssets([]);
        setUsageStats(null);
        fetchAssets();
      } else {
        alert('Delete All failed: ' + response.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
      setNukeConfirmText('');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-500">Manage your Cloudinary storage and optimize assets.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsNukeModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-semibold"
          >
            <Skull className="w-4 h-4 mr-2" />
            Nuke All Assets
          </button>
          <button 
            onClick={() => fetchAssets()}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <HardDrive className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Storage Used</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {usageStats?.storage?.usage !== undefined ? formatSize(usageStats.storage.usage) : '---'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            using {usageStats?.credits?.usage} of {usageStats?.credits?.limit} Credits
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Assets</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {usageStats?.resources !== undefined ? usageStats.resources : '---'}
          </div>
          <div className="text-xs text-gray-400 mt-1">Images & Videos</div>
        </div>
      </div>

      {/* Bulk Delete Section */}
      <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
        <div className="bg-red-50 px-6 py-3 border-b border-red-100 flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          <h2 className="text-sm font-bold text-red-800 uppercase tracking-wider">Date Range Cleanup</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10 w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10 w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" 
                />
              </div>
            </div>
            <button 
              onClick={handleBulkDelete}
              disabled={bulkDeleting || !startDate || !endDate}
              className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-md shadow-red-200"
            >
              {bulkDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Bulk Delete Range
                </>
              )}
            </button>
          </div>
          
          <AnimatePresence>
            {bulkResult && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center border border-green-100"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Successfully deleted {bulkResult.count} assets.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Media Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
        {error && (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Connection Error</h3>
            <p className="text-gray-500 mt-1 max-w-lg mx-auto">{error}</p>
            <p className="text-sm text-gray-400 mt-4 max-w-lg mx-auto">
              {error.includes('npm run electron:dev') ? (
                <>
                  Cloudinary credentials are read by Electron from <code className="text-gray-600">frontend/admin/.env</code>{' '}
                  (<code className="text-gray-600">CLOUDINARY_API_KEY</code>, <code className="text-gray-600">CLOUDINARY_API_SECRET</code>, and optionally{' '}
                  <code className="text-gray-600">VITE_CLOUDINARY_CLOUD_NAME</code>).
                </>
              ) : (
                <>Make sure CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are set in frontend/admin/.env, then restart the Electron app.</>
              )}
            </p>
          </div>
        )}

        {!error && assets.length === 0 && !loading && (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-gray-400 mb-4">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No assets found</h3>
            <p className="text-gray-500 mt-1">Upload some files to see them here.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
          {assets.map((asset) => (
            <motion.div 
              layout
              key={asset.public_id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <div className="relative aspect-square bg-gray-200 overflow-hidden">
                <img 
                  src={asset.secure_url} 
                  alt={asset.public_id}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <a 
                    href={asset.secure_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <button 
                    onClick={() => handleDeleteSingle(asset.public_id)}
                    className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white backdrop-blur-sm transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[10px] text-white uppercase font-bold">
                  {asset.format}
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-xs font-mono text-gray-600 truncate mb-1" title={asset.public_id}>
                  {asset.public_id}
                </h3>
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(asset.created_at).toLocaleDateString()}
                  </span>
                  <span>{formatSize(asset.bytes)}</span>
                </div>
              </div>
            </motion.div>
          ))}
          
          {loading && assets.length === 0 && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="flex justify-between">
                  <div className="h-2 bg-gray-200 rounded w-1/4" />
                  <div className="h-2 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {nextCursor && !loading && (
          <div className="p-6 border-t border-gray-100 flex justify-center">
            <button 
              onClick={() => fetchAssets(nextCursor)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium"
            >
              Load More
            </button>
          </div>
        )}
      </div>

      {/* Debug Section */}
      <div className="mt-8 border-t pt-8">
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
        </button>
        
        {showDebug && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-900 rounded-lg overflow-auto max-h-[300px]">
              <h4 className="text-white text-xs font-bold mb-2">Usage Data:</h4>
              <pre className="text-[10px] text-green-400">{JSON.stringify(rawUsage, null, 2)}</pre>
            </div>
            <div className="p-4 bg-gray-900 rounded-lg overflow-auto max-h-[300px]">
              <h4 className="text-white text-xs font-bold mb-2">Asset Data (First 5):</h4>
              <pre className="text-[10px] text-blue-400">{JSON.stringify(rawAssets?.resources?.slice(0, 5), null, 2)}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Nuke Confirmation Modal */}
      <AnimatePresence>
        {isNukeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNukeModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-red-100 w-full max-w-md overflow-hidden"
            >
              <div className="bg-red-600 p-6 text-white text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
                  <Skull className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold">Extreme Danger Zone</h3>
                <p className="text-red-100 text-sm mt-2">
                  You are about to permanently delete EVERY file in your Cloudinary account. This cannot be undone.
                </p>
              </div>
              
              <div className="p-8">
                <p className="text-sm text-gray-600 mb-6 text-center">
                  To confirm this action, please type the phrase below:
                  <br />
                  <span className="font-mono font-bold text-red-600 mt-2 block select-all">{NUKE_PHRASE}</span>
                </p>
                
                <input 
                  type="text" 
                  value={nukeConfirmText}
                  onChange={(e) => setNukeConfirmText(e.target.value)}
                  placeholder="Type the confirmation phrase..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:ring-red-500 transition-all text-center font-bold"
                />
                
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <button 
                    onClick={() => setIsNukeModalOpen(false)}
                    className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleNukeAll}
                    disabled={nukeConfirmText !== NUKE_PHRASE}
                    className="px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-200"
                  >
                    Nuke Everything
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
