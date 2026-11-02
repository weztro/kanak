export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BaseUnit = 'g' | 'kg' | 'ml' | 'l' | 'pcs' | 'pack' | 'box' | 'bottle' | 'roll';

export type PaymentSource = 'PERSONAL' | 'COMMON_FUND';
export type PaymentMethod = 'UPI' | 'CASH' | 'CARD' | 'NET_BANKING' | 'BANK_TRANSFER' | 'OTHER';
export type PurchaseStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';
export type MemberRole = 'admin' | 'member';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks' | 'Other';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ShoppingItemStatus = 'PENDING' | 'PURCHASED' | 'CANCELLED';
export type StockTransactionType = 'OPENING' | 'PURCHASE' | 'CONSUMPTION' | 'ADJUSTMENT' | 'WASTAGE' | 'REVERSAL';
export type FundTransactionType = 'CONTRIBUTION_IN' | 'PURCHASE_OUT' | 'EXPENSE_OUT' | 'ADJUSTMENT' | 'REVERSAL';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Accommodation {
  id: string;
  name: string;
  monthly_budget: number;
  default_monthly_contribution: number;
  currency: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  accommodation_id: string;
  profile_id: string;
  role: MemberRole;
  joining_date: string;
  leaving_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Category {
  id: string;
  accommodation_id?: string | null;
  name: string;
  description?: string | null;
  icon?: string | null;
  sort_order: number;
  is_system: boolean;
  created_at: string;
}

export interface Item {
  id: string;
  accommodation_id: string;
  category_id: string;
  name: string;
  description?: string | null;
  base_unit: BaseUnit;
  minimum_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  inventory?: Inventory;
}

export interface Inventory {
  id: string;
  accommodation_id: string;
  item_id: string;
  current_stock: number;
  average_purchase_price: number;
  last_purchased_at?: string | null;
  updated_at: string;
  item?: Item;
}

export interface StockTransaction {
  id: string;
  accommodation_id: string;
  item_id: string;
  transaction_type: StockTransactionType;
  quantity: number;
  unit: string;
  quantity_normalized: number;
  stock_before: number;
  stock_after: number;
  unit_price: number;
  reference_type?: string | null;
  reference_id?: string | null;
  reason?: string | null;
  recorded_by: string;
  created_at: string;
  recorder?: Profile;
  item?: Item;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  item_id: string;
  quantity: number;
  unit: string;
  quantity_normalized: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  item?: Item;
}

export interface Purchase {
  id: string;
  accommodation_id: string;
  purchase_date: string;
  shop_name: string;
  purchased_by: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  payment_source: PaymentSource;
  payment_method: PaymentMethod;
  status: PurchaseStatus;
  bill_file_path?: string | null;
  bill_file_name?: string | null;
  bill_file_size?: number | null;
  bill_file_mime?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  buyer?: Member;
  items?: PurchaseItem[];
}

export interface ConsumptionLog {
  id: string;
  accommodation_id: string;
  consumption_date: string;
  meal_type: MealType;
  recorded_by: string;
  notes?: string | null;
  created_at: string;
  recorder?: Member;
  items?: ConsumptionItem[];
}

export interface ConsumptionItem {
  id: string;
  consumption_log_id: string;
  item_id: string;
  quantity: number;
  unit: string;
  quantity_normalized: number;
  created_at: string;
  item?: Item;
}

export interface Contribution {
  id: string;
  accommodation_id: string;
  member_id: string;
  period_month: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_id?: string | null;
  notes?: string | null;
  created_at: string;
  member?: Member;
}

export interface Expense {
  id: string;
  accommodation_id: string;
  description: string;
  category: string;
  amount: number;
  paid_by: string;
  payment_source: PaymentSource;
  expense_date: string;
  receipt_url?: string | null;
  notes?: string | null;
  status: 'POSTED' | 'CANCELLED';
  created_at: string;
  payer?: Member;
}

export interface ExpenseAllocation {
  id: string;
  accommodation_id: string;
  expense_type: 'PURCHASE' | 'EXPENSE';
  expense_id: string;
  member_id: string;
  allocated_amount: number;
  expense_date: string;
  created_at: string;
  member?: Member;
}

export interface FundTransaction {
  id: string;
  accommodation_id: string;
  transaction_type: FundTransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_type?: string | null;
  reference_id?: string | null;
  notes?: string | null;
  recorded_by: string;
  created_at: string;
  recorder?: Profile;
}

export interface Settlement {
  id: string;
  accommodation_id: string;
  from_member_id: string;
  to_member_id: string;
  amount: number;
  settlement_date: string;
  payment_method: PaymentMethod;
  transaction_reference?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  notes?: string | null;
  created_at: string;
  from_member?: Member;
  to_member?: Member;
}

export interface ShoppingList {
  id: string;
  accommodation_id: string;
  title: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  created_at: string;
  items?: ShoppingListItem[];
}

export interface ShoppingListItem {
  id: string;
  shopping_list_id: string;
  item_id?: string | null;
  custom_item_name?: string | null;
  quantity: number;
  unit: string;
  priority: PriorityLevel;
  assigned_to?: string | null;
  status: ShoppingItemStatus;
  notes?: string | null;
  created_at: string;
  item?: Item;
  assignee?: Member;
}

export interface Notification {
  id: string;
  accommodation_id: string;
  recipient_id: string;
  title: string;
  message: string;
  type: 'LOW_STOCK' | 'CONTRIBUTION_DUE' | 'SETTLEMENT' | 'PURCHASE' | 'EXPENSE' | 'SYSTEM';
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface MemberBalanceRow {
  member_id: string;
  profile_id: string;
  full_name: string;
  avatar_url?: string | null;
  role: string;
  is_active: boolean;
  total_contributions: number;
  personal_advances: number;
  allocated_expenses: number;
  settlements_paid: number;
  settlements_received: number;
  net_balance: number;
}

