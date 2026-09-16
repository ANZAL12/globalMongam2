import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Sale } from '../../types';
import { 
  Search, 
  ShoppingBag, 
  Calendar, 
  User, 
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  FileDown,
  Loader2,
  Printer,
  FileText,
  RotateCcw,
  X
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Pagination } from '../../components/Pagination';
import { PrintPreviewModal } from '../../components/PrintPreviewModal';
import {
  exportAllSalesToPdf,
  generateAllSalesHtml,
  generateSingleSaleHtml,
  generateMultiSaleFullPagesHtml,
  openAllSalesInSystemViewer,
  openSingleSaleInSystemViewer,
  exportSingleSaleToPdf,
  printHtml,
} from '../../utils/salesPdfExport';

type SalesListItem = Omit<Sale, 'status'> & {
  status: Sale['status'] | 'approver_approved';
  promoter_name?: string | null;
  promoter_email?: string | null;
  promoter_phone?: string | null;
  promoter_gpay?: string | null;
  promoter_upi?: string | null;
  approver_name?: string | null;
  has_duplicate_serial?: boolean;
  approved_at?: string | null;
  paid_at?: string | null;
};

export function SalesList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sales, setSales] = useState<SalesListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  
  const initialStatus = searchParams.get('status') || 'all';
  const initialDate = searchParams.get('date') || 'all';
  const initialCustomDate = searchParams.get('customDate') || '';

  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [dateFilter, setDateFilter] = useState<string>(initialDate);
  const [customDate, setCustomDate] = useState<string>(initialCustomDate);

  const [exporting, setExporting] = useState(false);
  const [printingReport, setPrintingReport] = useState(false);
  const [printingSaleId, setPrintingSaleId] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    htmlContent: string;
    onPrint: () => void;
    onOpenInSystemViewer?: () => Promise<void>;
    onDownloadPdf?: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    htmlContent: '',
    onPrint: () => {},
  });
  const navigate = useNavigate();

  // Date comparison helpers
  const isSameDay = (dateStr: string | null | undefined, targetDate: Date = new Date()) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return (
      d.getFullYear() === targetDate.getFullYear() &&
      d.getMonth() === targetDate.getMonth() &&
      d.getDate() === targetDate.getDate()
    );
  };

  const isYesterday = (dateStr: string | null | undefined) => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return isSameDay(dateStr, y);
  };

  const isThisWeek = (dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    return d >= startOfWeek;
  };

  const isThisMonth = (dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  const isSpecificDate = (dateStr: string | null | undefined, ymd: string) => {
    if (!dateStr || !ymd) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` === ymd;
  };

  const checkDateMatch = (dateStr: string | null | undefined, filter: string, custom: string) => {
    if (!dateStr) return false;
    if (filter === 'today') return isSameDay(dateStr);
    if (filter === 'yesterday') return isYesterday(dateStr);
    if (filter === 'this_week') return isThisWeek(dateStr);
    if (filter === 'this_month') return isThisMonth(dateStr);
    if (filter === 'custom') return isSpecificDate(dateStr, custom);
    return true;
  };

  // Generate human-readable filter description for previews & exported files
  const getFilterDescription = () => {
    let statusText = '';
    if (statusFilter === 'pending') statusText = 'Pending';
    else if (statusFilter === 'approver_approved') statusText = 'Approved';
    else if (statusFilter === 'paid') statusText = 'Paid';
    else if (statusFilter === 'rejected') statusText = 'Rejected';

    let dateText = '';
    if (dateFilter === 'today') dateText = "Today's";
    else if (dateFilter === 'yesterday') dateText = "Yesterday's";
    else if (dateFilter === 'this_week') dateText = 'This Week';
    else if (dateFilter === 'this_month') dateText = 'This Month';
    else if (dateFilter === 'custom' && customDate) dateText = customDate;

    if (dateText && statusText) {
      return `${dateText} ${statusText} Sales`;
    } else if (dateText) {
      return `${dateText} Sales (All Status)`;
    } else if (statusText) {
      return `${statusText} Sales`;
    }
    return 'All Sales';
  };

  const filterDesc = getFilterDescription();

  const handleExportPdf = async () => {
    try {
      setExporting(true);
      await exportAllSalesToPdf(filteredSales, {
        filterTitle: filterDesc,
        searchTerm: searchTerm,
      });
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrintReport = async () => {
    try {
      setPrintingReport(true);
      const html = await generateAllSalesHtml(filteredSales, {
        filterTitle: filterDesc,
        searchTerm: searchTerm,
      });
      setPreviewModal({
        isOpen: true,
        title: `Sales Report Preview (${filterDesc}) - ${filteredSales.length} Records`,
        htmlContent: html,
        onPrint: () => printHtml(html),
        onOpenInSystemViewer: async () => {
          await openAllSalesInSystemViewer(filteredSales, {
            filterTitle: filterDesc,
            searchTerm: searchTerm,
          });
        },
        onDownloadPdf: async () => {
          await exportAllSalesToPdf(filteredSales, {
            filterTitle: filterDesc,
            searchTerm: searchTerm,
          });
        },
      });
    } catch (err) {
      console.error('Failed to prepare print preview:', err);
      alert('Failed to prepare print preview. Please try again.');
    } finally {
      setPrintingReport(false);
    }
  };

  const handlePrintFullDetailsPages = async () => {
    try {
      setPrintingReport(true);
      const html = await generateMultiSaleFullPagesHtml(filteredSales as any);
      setPreviewModal({
        isOpen: true,
        title: `Sale Dockets (${filterDesc}) - ${filteredSales.length} Records`,
        htmlContent: html,
        onPrint: () => printHtml(html),
      });
    } catch (err) {
      console.error('Failed to prepare full page print preview:', err);
      alert('Failed to prepare print preview. Please try again.');
    } finally {
      setPrintingReport(false);
    }
  };

  const handlePrintSingleSale = async (e: React.MouseEvent, sale: SalesListItem) => {
    e.stopPropagation();
    try {
      setPrintingSaleId(sale.id);
      const html = await generateSingleSaleHtml(sale as any);
      setPreviewModal({
        isOpen: true,
        title: `Sale Voucher Preview - ${sale.bill_no || sale.id.slice(0, 8)}`,
        htmlContent: html,
        onPrint: () => printHtml(html),
        onOpenInSystemViewer: async () => {
          await openSingleSaleInSystemViewer(sale as any);
        },
        onDownloadPdf: async () => {
          await exportSingleSaleToPdf(sale as any);
        },
      });
    } catch (err) {
      console.error('Failed to prepare sale voucher preview:', err);
      alert('Failed to prepare sale voucher preview. Please try again.');
    } finally {
      setPrintingSaleId(null);
    }
  };
  const normalizeSerial = (serial: string | null | undefined) => serial?.trim().toLowerCase() || '';
  const getLatestSaleId = (items: any[]) => {
    if (items.length === 0) return '';
    return [...items]
      .sort((a, b) => {
        const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (timeDiff !== 0) return timeDiff;
        return String(b.id).localeCompare(String(a.id));
      })[0]?.id;
  };

  const applyFilters = (newStatus: string, newDate: string, newCustomDate: string = '') => {
    setStatusFilter(newStatus);
    setDateFilter(newDate);
    setCustomDate(newCustomDate);

    if (newStatus === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', newStatus);
    }

    if (newDate === 'all') {
      searchParams.delete('date');
      searchParams.delete('customDate');
    } else {
      searchParams.set('date', newDate);
      if (newDate === 'custom' && newCustomDate) {
        searchParams.set('customDate', newCustomDate);
      } else {
        searchParams.delete('customDate');
      }
    }

    setSearchParams(searchParams, { replace: true });
    setCurrentPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    applyFilters(e.target.value, dateFilter, customDate);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    applyFilters(statusFilter, e.target.value, customDate);
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyFilters(statusFilter, 'custom', e.target.value);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    applyFilters('all', 'all', '');
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    async function fetchSales() {
      try {
        const { data, error } = await supabase
          .from('sales')
          .select(`
            *,
            promoter:users!sales_promoter_id_fkey (
              full_name,
              email,
              phone_number,
              gpay_number,
              upi_id
            ),
            approver:users!approved_by (
              full_name,
              email
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const serialCounts = new Map<string, number>();
        const serialGroups = new Map<string, any[]>();
        for (const sale of data || []) {
          const serialKey = normalizeSerial(sale.serial_no);
          if (!serialKey) continue;
          serialCounts.set(serialKey, (serialCounts.get(serialKey) || 0) + 1);
          serialGroups.set(serialKey, [...(serialGroups.get(serialKey) || []), sale]);
        }

        const mappedSales = (data || []).map((sale: any) => ({
          ...sale,
          promoter_name: sale.promoter?.full_name || null,
          promoter_email: sale.promoter?.email || 'Unknown',
          promoter_phone: sale.promoter?.phone_number || null,
          promoter_gpay: sale.promoter?.gpay_number || null,
          promoter_upi: sale.promoter?.upi_id || null,
          approver_name: sale.approver?.full_name || sale.approver?.email || null,
          approved_at: sale.approved_at || null,
          paid_at: sale.paid_at || null,
          has_duplicate_serial: (() => {
            const serialKey = normalizeSerial(sale.serial_no);
            if (!serialKey) return false;
            const isDuplicateSerial = (serialCounts.get(serialKey) || 0) > 1;
            if (!isDuplicateSerial) return false;
            const latestId = getLatestSaleId(serialGroups.get(serialKey) || []);
            return sale.id === latestId;
          })(),
        }));

        setSales(mappedSales);
      } catch (err) {
        console.error('Error fetching sales:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSales();

    const channel = supabase
      .channel('sales-list-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          fetchSales();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredSales = sales.filter(s => {
    const matchesSearch = 
      s.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.promoter_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.bill_no?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' 
        ? true 
        : statusFilter === 'paid'
        ? (s.status === 'paid' || s.payment_status === 'paid')
        : s.status === statusFilter;

    const matchesDate = (() => {
      if (dateFilter === 'all') return true;

      if (statusFilter === 'pending') {
        return checkDateMatch(s.created_at, dateFilter, customDate);
      }
      if (statusFilter === 'approver_approved') {
        return checkDateMatch(s.approved_at || s.created_at, dateFilter, customDate);
      }
      if (statusFilter === 'paid') {
        return checkDateMatch(s.paid_at || s.created_at, dateFilter, customDate);
      }
      
      // If statusFilter is 'all' or 'rejected'
      return (
        checkDateMatch(s.created_at, dateFilter, customDate) ||
        checkDateMatch(s.approved_at, dateFilter, customDate) ||
        checkDateMatch(s.paid_at, dateFilter, customDate)
      );
    })();
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Overall status counts
  const awaitingApproverCount = sales.filter(s => s.status === 'pending').length;
  const readyToPayCount = sales.filter(s => s.status === 'approver_approved' && s.payment_status !== 'paid').length;
  const paidCount = sales.filter(s => s.payment_status === 'paid' || s.status === 'paid').length;

  // Today-specific counts
  const todayPendingCount = sales.filter(
    s => s.status === 'pending' && isSameDay(s.created_at)
  ).length;

  const todayApprovedCount = sales.filter(
    s => (s.status === 'approver_approved' || s.status === 'approved') && 
         (isSameDay(s.approved_at) || (!s.approved_at && isSameDay(s.created_at)))
  ).length;

  const todayPaidCount = sales.filter(
    s => (s.payment_status === 'paid' || s.status === 'paid') && 
         (isSameDay(s.paid_at) || (!s.paid_at && isSameDay(s.created_at)))
  ).length;

  const getSaleStatusLabel = (sale: any) => {
    if (sale.status === 'approver_approved') {
      return `Approved by ${sale.approver_name || 'Approver'}`;
    }
    return sale.status.replace('_', ' ');
  };

  const totalPages = Math.ceil(filteredSales.length / rowsPerPage);
  const currentData = filteredSales.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isTodayApprovedActive = dateFilter === 'today' && statusFilter === 'approver_approved';
  const isTodayPendingActive = dateFilter === 'today' && statusFilter === 'pending';
  const isTodayPaidActive = dateFilter === 'today' && statusFilter === 'paid';
  const isAllSalesActive = dateFilter === 'all' && statusFilter === 'all' && !searchTerm;

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col w-full space-y-6 min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors text-gray-600 hover:text-gray-900 shadow-sm flex items-center justify-center cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sales Management</h1>
            <p className="mt-1 text-sm text-gray-500">Monitor and manage all sales submissions from promoters.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handlePrintFullDetailsPages}
            disabled={printingReport || filteredSales.length === 0}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all shadow-sm hover:shadow shrink-0 cursor-pointer"
            title="Print each filtered sale as a full page of all details (docket format)"
          >
            {printingReport ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <FileText className="h-4 w-4 text-white" />
            )}
            <span>Print Full Details ({filteredSales.length})</span>
          </button>

          <button
            onClick={handlePrintReport}
            disabled={printingReport || filteredSales.length === 0}
            className="inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-semibold text-sm rounded-xl transition-all shadow-sm hover:shadow shrink-0 cursor-pointer"
            title="Print summary table report for filtered sales"
          >
            <Printer className="h-4 w-4 text-gray-500" />
            <span>Table Report</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exporting || filteredSales.length === 0}
            className="inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-semibold text-sm rounded-xl transition-all shadow-sm hover:shadow shrink-0 cursor-pointer"
            title="Download complete filtered sales report as PDF"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
            ) : (
              <FileDown className="h-4 w-4 text-rose-600" />
            )}
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <div className="bg-white shadow-xs border border-gray-200/80 rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Slim KPI Metrics Bar */}
        <div className="px-6 py-2.5 border-b border-gray-100 bg-gray-50/50 grid grid-cols-3 gap-3 shrink-0">
          <button
            type="button"
            onClick={() => applyFilters('pending', statusFilter === 'pending' && dateFilter === 'today' ? 'all' : 'today')}
            className={`flex items-center justify-between px-3.5 py-2 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-50/80 border-amber-200 text-amber-900 shadow-xs ring-1 ring-amber-300'
                : 'bg-white border-gray-200/70 text-gray-700 hover:border-gray-300'
            }`}
          >
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Awaiting Approver</div>
              <div className="text-base font-bold text-gray-900 leading-none mt-0.5">{awaitingApproverCount}</div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-800">
              {todayPendingCount} today
            </span>
          </button>

          <button
            type="button"
            onClick={() => applyFilters('approver_approved', statusFilter === 'approver_approved' && dateFilter === 'today' ? 'all' : 'today')}
            className={`flex items-center justify-between px-3.5 py-2 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'approver_approved'
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 shadow-xs ring-1 ring-emerald-300'
                : 'bg-white border-gray-200/70 text-gray-700 hover:border-gray-300'
            }`}
          >
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ready to Pay</div>
              <div className="text-base font-bold text-gray-900 leading-none mt-0.5">{readyToPayCount}</div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800">
              {todayApprovedCount} today
            </span>
          </button>

          <button
            type="button"
            onClick={() => applyFilters('paid', statusFilter === 'paid' && dateFilter === 'today' ? 'all' : 'today')}
            className={`flex items-center justify-between px-3.5 py-2 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'paid'
                ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900 shadow-xs ring-1 ring-indigo-300'
                : 'bg-white border-gray-200/70 text-gray-700 hover:border-gray-300'
            }`}
          >
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Paid</div>
              <div className="text-base font-bold text-gray-900 leading-none mt-0.5">{paidCount}</div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100/80 text-indigo-800">
              {todayPaidCount} today
            </span>
          </button>
        </div>

        {/* Minimal Unified Filters Toolbar */}
        <div className="px-6 py-2.5 border-b border-gray-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          {/* Left: Search */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search product, promoter, bill..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 focus:border-indigo-500 rounded-lg transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Center: Segmented Quick Filters */}
          <div className="inline-flex items-center p-1 bg-gray-100/90 rounded-xl space-x-1 overflow-x-auto self-start md:self-auto">
            <button
              type="button"
              onClick={() => applyFilters('all', 'all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                isAllSalesActive
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All ({sales.length})
            </button>
            <button
              type="button"
              onClick={() => applyFilters('approver_approved', 'today')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                isTodayApprovedActive
                  ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Filter to today's approved sales"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isTodayApprovedActive ? 'bg-emerald-500' : 'bg-emerald-400'}`}></span>
              <span>Today Approved</span>
              <span className="text-[10px] opacity-75">({todayApprovedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => applyFilters('pending', 'today')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                isTodayPendingActive
                  ? 'bg-white text-amber-700 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Filter to today's pending sales"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isTodayPendingActive ? 'bg-amber-500' : 'bg-amber-400'}`}></span>
              <span>Today Pending</span>
              <span className="text-[10px] opacity-75">({todayPendingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => applyFilters('paid', 'today')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                isTodayPaidActive
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Filter to today's paid sales"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isTodayPaidActive ? 'bg-indigo-500' : 'bg-indigo-400'}`}></span>
              <span>Today Paid</span>
              <span className="text-[10px] opacity-75">({todayPaidCount})</span>
            </button>
          </div>

          {/* Right: Date & Status Selects */}
          <div className="flex items-center space-x-2 self-end md:self-auto shrink-0">
            <select
              value={dateFilter}
              onChange={handleDateChange}
              className="px-2 py-1.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 outline-none cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Date...</option>
            </select>

            {dateFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={handleCustomDateChange}
                className="px-2 py-1 text-xs border border-indigo-300 rounded-lg text-gray-800 outline-none"
              />
            )}

            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="px-2 py-1.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approver_approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>

            {(statusFilter !== 'all' || dateFilter !== 'all' || searchTerm !== '' || customDate !== '') && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                title="Reset filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Subtle inline status strip when filtered */}
        {(statusFilter !== 'all' || dateFilter !== 'all' || searchTerm !== '') && (
          <div className="px-6 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500 shrink-0">
            <span>
              Showing <strong className="text-gray-800 font-semibold">{filteredSales.length}</strong> {filterDesc.toLowerCase()} {searchTerm ? `matching "${searchTerm}"` : ''}
            </span>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-gray-500 hover:text-gray-800 underline font-medium cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Product & Bill</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Promoter</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {currentData.map((sale) => (
                <tr 
                  key={sale.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/sales/${sale.id}`)}
                >
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mr-4 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm border border-indigo-100">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{sale.product_name}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Bill: {sale.bill_no || 'N/A'}</div>
                        {sale.has_duplicate_serial && (
                          <div className="text-[10px] text-rose-700 font-bold uppercase tracking-wide mt-1">
                            Duplicate serial detected
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-600 font-medium">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      {sale.promoter_email}
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900 italic-none">₹{parseFloat(sale.bill_amount).toLocaleString()}</div>
                    {sale.incentive_amount && (
                      <div className="text-[10px] text-emerald-600 font-bold tracking-tight">
                        + ₹{sale.incentive_amount} Incentive
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold ${
                      sale.status === 'approver_approved'
                        ? 'bg-blue-100 text-blue-800'
                        : sale.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sale.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {sale.status === 'approver_approved' || sale.status === 'paid' ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : sale.status === 'rejected' ? (
                        <XCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {getSaleStatusLabel(sale)}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center text-xs text-gray-500 font-medium">
                      <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-300" />
                      {new Date(sale.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handlePrintSingleSale(e, sale)}
                      disabled={printingSaleId === sale.id}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      title="Print only that full page of all details for this sale (docket format, not table)"
                    >
                      {printingSaleId === sale.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-indigo-600" />
                      )}
                      <span>Print Full Page</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
                      <ShoppingBag className="h-12 w-12 opacity-10" />
                      <p className="text-sm font-medium">No sales records found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {filteredSales.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredSales.length}
            itemsPerPage={rowsPerPage}
          />
        )}
      </div>

      <PrintPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
        title={previewModal.title}
        htmlContent={previewModal.htmlContent}
        onPrint={previewModal.onPrint}
        onOpenInSystemViewer={previewModal.onOpenInSystemViewer}
        onDownloadPdf={previewModal.onDownloadPdf}
      />
    </div>
  );
}
