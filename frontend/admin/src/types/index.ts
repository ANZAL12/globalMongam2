export type Sale = {
  id: string;
  promoter_id: string;
  product_name: string;
  model_no: string | null;
  serial_no: string | null;
  bill_no: string | null;
  bill_amount: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  incentive_amount: string | null;
  payment_status: 'pending' | 'paid' | 'not_applicable';
  created_at: string;
  promoter_email?: string;
  transaction_id?: string | null;
  promoter_phone?: string | null;
  promoter_gpay?: string | null;
};

export type Promoter = {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  gpay_number: string | null;
  created_at: string;
  role: 'promoter' | 'admin';
};

export type Announcement = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  created_at: string;
};

export type SystemLog = {
  id: string;
  action: string;
  details: string;
  user_email: string;
  created_at: string;
};
