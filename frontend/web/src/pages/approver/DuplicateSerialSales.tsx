import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { ArrowLeft } from 'lucide-react';

type DuplicateSale = {
  id: string;
  product_name: string;
  model_no: string | null;
  serial_no: string | null;
  bill_no: string | null;
  bill_amount: string;
  status: string;
  created_at: string;
  promoter?: {
    email?: string | null;
  } | null;
};

export default function DuplicateSerialSales() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serial = searchParams.get('serial') || '';
  const currentSaleId = searchParams.get('currentSaleId') || '';
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<DuplicateSale[]>([]);

  const normalizeSerial = (value: string | null | undefined) => value?.trim().toLowerCase() || '';
  const serialKey = normalizeSerial(serial);

  useEffect(() => {
    async function fetchMatchingSales() {
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
            model_no,
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
      } catch (error) {
        console.error('Failed to fetch matching sales', error);
        setSales([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMatchingSales();
  }, [serial, serialKey]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approver_approved':
      case 'approved':
      case 'paid':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      case 'pending':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="flex-1 bg-[#f5f5f5] min-h-screen">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4 p-1 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Duplicate Serial Sales</h1>
          <p className="text-xs text-gray-500 font-semibold mt-0.5">Serial: {serial || 'N/A'}</p>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12 text-gray-500 font-medium">No matching sales found.</div>
        ) : (
          <div className="space-y-3">
            {sales.map((item) => {
              const isCurrentSale = item.id === currentSaleId;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/approver/sale/${item.id}`)}
                  className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border transition-colors hover:bg-gray-50 ${
                    isCurrentSale ? 'border-[#1976d2] border-2' : 'border-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
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
                    {isCurrentSale && <span className="text-[10px] font-bold uppercase text-[#1976d2]">Current sale</span>}
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
