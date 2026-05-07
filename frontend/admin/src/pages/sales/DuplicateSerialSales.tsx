import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type DuplicateSale = {
  id: string;
  product_name: string;
  serial_no: string | null;
  bill_no: string | null;
  bill_amount: string;
  status: string;
  created_at: string;
  promoter?: {
    email?: string | null;
  } | null;
};

export function DuplicateSerialSales() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serial = searchParams.get('serial') || '';
  const currentSaleId = searchParams.get('currentSaleId') || '';
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<DuplicateSale[]>([]);

  const normalizeSerial = (value: string | null | undefined) => value?.trim().toLowerCase() || '';
  const serialKey = normalizeSerial(serial);

  useEffect(() => {
    async function fetchSales() {
      if (!serialKey) {
        setSales([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('sales')
          .select(`
            id,
            product_name,
            serial_no,
            bill_no,
            bill_amount,
            status,
            created_at,
            promoter:users!promoter_id(email)
          `)
          .ilike('serial_no', serial.trim())
          .order('created_at', { ascending: false });

        if (error) throw error;
        const exactMatches = (data || []).filter((sale: any) => normalizeSerial(sale.serial_no) === serialKey);
        setSales(exactMatches as DuplicateSale[]);
      } catch (err) {
        console.error('Failed to load duplicate serial sales:', err);
        setSales([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSales();
  }, [serial, serialKey]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approver_approved':
      case 'approved':
      case 'paid':
        return 'text-emerald-700';
      case 'rejected':
        return 'text-rose-700';
      case 'pending':
        return 'text-orange-700';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-2xl bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all hover:shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Duplicate Serial Sales</h1>
          <p className="mt-1 text-sm text-gray-500">Serial: {serial || 'N/A'}</p>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-3xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center min-h-[260px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : sales.length === 0 ? (
          <div className="min-h-[220px] flex items-center justify-center text-gray-500 font-medium">
            No matching sales found.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sales.map((item) => {
              const isCurrentSale = item.id === currentSaleId;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/sales/${item.id}`)}
                  className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors ${
                    isCurrentSale ? 'bg-indigo-50/60' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-gray-900">{item.product_name}</p>
                      <p className="text-xs text-gray-500 mt-1">Promoter: {item.promoter?.email || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">Bill: {item.bill_no || 'N/A'}</p>
                      <p className="text-xs text-gray-500">Date: {new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className="text-base font-black text-indigo-600">₹{item.bill_amount}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                    {isCurrentSale ? (
                      <span className="text-[10px] font-bold uppercase text-indigo-600">Current sale</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
