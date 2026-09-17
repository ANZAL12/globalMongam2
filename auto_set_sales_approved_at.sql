-- Ensure approved_at is automatically set to NOW() when a sale is approved if not already set
CREATE OR REPLACE FUNCTION set_sales_approved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('approver_approved', 'approved') AND NEW.approved_at IS NULL THEN
    NEW.approved_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_sales_approved_at ON public.sales;
CREATE TRIGGER trigger_set_sales_approved_at
BEFORE INSERT OR UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION set_sales_approved_at();
