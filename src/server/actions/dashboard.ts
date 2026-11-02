"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveAccommodationId } from "./accommodation";
import { getMemberBalancesData } from "./settlements";
import { getInventoryItems } from "./inventory";

export interface DashboardMetrics {
  totalMembers: number;
  monthlyExpenses: number;
  commonFundBalance: number;
  monthlyContributions: number;
  totalInventoryItems: number;
  lowStockCount: number;
  pendingSettlementCount: number;
  monthlyBudget: number;
  currency: string;
  expenseTrend: { month: string; amount: number }[];
  categoryBreakdown: { name: string; value: number }[];
  recentPurchases: {
    id: string;
    shop_name: string;
    purchase_date: string;
    total_amount: number;
    payment_source: string;
    buyer_name: string;
  }[];
  recentConsumption: {
    id: string;
    consumption_date: string;
    meal_type: string;
    recorder_name: string;
    items_summary: string;
  }[];
  lowStockItems: {
    id: string;
    name: string;
    current_stock: number;
    minimum_stock: number;
    base_unit: string;
    category_name: string;
  }[];
  pendingShoppingItems: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    priority: string;
  }[];
  memberContributionsSummary: {
    name: string;
    paid: number;
    expected: number;
  }[];
}

export async function getDashboardData(selectedMonthDate?: string): Promise<DashboardMetrics | null> {
  const accId = await getActiveAccommodationId();
  if (!accId) return null;

  const supabase = await createClient();

  // Active month: defaults to current month YYYY-MM-01
  const now = selectedMonthDate ? new Date(selectedMonthDate) : new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const monthStart = `${year}-${month}-01`;
  const monthEnd = new Date(year, now.getMonth() + 1, 0).toISOString().split("T")[0];

  // 1. Accommodation details
  const { data: acc } = await supabase
    .from("accommodations")
    .select("monthly_budget, default_monthly_contribution, currency")
    .eq("id", accId)
    .single();

  // 2. Active members
  const { data: members } = await supabase
    .from("members")
    .select(`
      id,
      is_active,
      profile:profiles(full_name)
    `)
    .eq("accommodation_id", accId)
    .eq("is_active", true);

  const totalMembers = members?.length || 0;

  // 3. Current month purchases
  const { data: purchases } = await supabase
    .from("purchases")
    .select(`
      id,
      shop_name,
      purchase_date,
      total_amount,
      payment_source,
      status,
      buyer:members(profile:profiles(full_name))
    `)
    .eq("accommodation_id", accId)
    .eq("status", "POSTED")
    .gte("purchase_date", monthStart)
    .lte("purchase_date", monthEnd)
    .order("purchase_date", { ascending: false });

  const monthlyGroceryPurchases = (purchases || []).reduce(
    (sum, p) => sum + Number(p.total_amount),
    0
  );

  // 4. Current month non-grocery expenses
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, amount, category, status, expense_date")
    .eq("accommodation_id", accId)
    .eq("status", "POSTED")
    .gte("expense_date", monthStart)
    .lte("expense_date", monthEnd);

  const monthlyNonGroceryExpenses = (expenses || []).reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  const monthlyExpenses = monthlyGroceryPurchases + monthlyNonGroceryExpenses;

  // 5. Common Fund Balance
  const { data: latestFundTx } = await supabase
    .from("fund_transactions")
    .select("balance_after")
    .eq("accommodation_id", accId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const commonFundBalance = Number(latestFundTx?.balance_after || 0);

  // 6. Current month contributions
  const { data: contribs } = await supabase
    .from("contributions")
    .select("amount, member_id")
    .eq("accommodation_id", accId)
    .gte("payment_date", monthStart)
    .lte("payment_date", monthEnd);

  const monthlyContributions = (contribs || []).reduce(
    (sum, c) => sum + Number(c.amount),
    0
  );

  // 7. Inventory Items & Low Stock
  const allItems = await getInventoryItems();
  const totalInventoryItems = allItems.length;

  const lowStockItems = allItems
    .filter((i) => {
      const cur = i.inventory?.current_stock || 0;
      return cur <= i.minimum_stock;
    })
    .map((i) => ({
      id: i.id,
      name: i.name,
      current_stock: i.inventory?.current_stock || 0,
      minimum_stock: i.minimum_stock,
      base_unit: i.base_unit,
      category_name: i.category?.name || "General",
    }));

  const lowStockCount = lowStockItems.length;

  // 8. Settlements & Net Balances
  const { suggestions } = await getMemberBalancesData();
  const pendingSettlementCount = suggestions.length;

  // 9. Monthly Expense Trend (last 6 months)
  const expenseTrend: { month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, now.getMonth() - i, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const mName = d.toLocaleDateString("en-IN", { month: "short" });

    // Fetch purchases & expenses for that month
    const { data: mPurchases } = await supabase
      .from("purchases")
      .select("total_amount")
      .eq("accommodation_id", accId)
      .eq("status", "POSTED")
      .gte("purchase_date", `${mStr}-01`)
      .lte("purchase_date", `${mStr}-31`);

    const { data: mExpenses } = await supabase
      .from("expenses")
      .select("amount")
      .eq("accommodation_id", accId)
      .eq("status", "POSTED")
      .gte("expense_date", `${mStr}-01`)
      .lte("expense_date", `${mStr}-31`);

    const pSum = (mPurchases || []).reduce((s, p) => s + Number(p.total_amount), 0);
    const eSum = (mExpenses || []).reduce((s, e) => s + Number(e.amount), 0);

    expenseTrend.push({
      month: mName,
      amount: pSum + eSum,
    });
  }

  // 10. Category Breakdown for current month
  const categoryMap: { [cat: string]: number } = {};

  // For grocery purchases: classify by "Groceries & Food"
  if (monthlyGroceryPurchases > 0) {
    categoryMap["Groceries"] = monthlyGroceryPurchases;
  }

  // For non-grocery expenses
  for (const exp of expenses || []) {
    categoryMap[exp.category] = (categoryMap[exp.category] || 0) + Number(exp.amount);
  }

  const categoryBreakdown = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  // 11. Recent Purchases (last 5)
  const { data: recentPurchasesRaw } = await supabase
    .from("purchases")
    .select(`
      id,
      shop_name,
      purchase_date,
      total_amount,
      payment_source,
      buyer:members(profile:profiles(full_name))
    `)
    .eq("accommodation_id", accId)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentPurchases = (recentPurchasesRaw || []).map((p) => {
    const rawBuyer = p.buyer as unknown as { profile: { full_name: string } } | null;
    return {
      id: p.id,
      shop_name: p.shop_name,
      purchase_date: p.purchase_date,
      total_amount: Number(p.total_amount),
      payment_source: p.payment_source,
      buyer_name: rawBuyer?.profile?.full_name || "Member",
    };
  });

  // 12. Recent Cooking Consumption (last 5)
  const { data: recentConsRaw } = await supabase
    .from("consumption_logs")
    .select(`
      id,
      consumption_date,
      meal_type,
      recorder:members(profile:profiles(full_name)),
      items:consumption_items(
        quantity,
        unit,
        item:items(name)
      )
    `)
    .eq("accommodation_id", accId)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentConsumption = (recentConsRaw || []).map((c) => {
    const rawRecorder = c.recorder as unknown as { profile: { full_name: string } } | null;
    const rawItems = (c.items as unknown as { quantity: number; unit: string; item: { name: string } }[]) || [];
    const itemsSummary = rawItems.map((i) => `${i.item?.name} (${i.quantity} ${i.unit})`).join(", ");

    return {
      id: c.id,
      consumption_date: c.consumption_date,
      meal_type: c.meal_type,
      recorder_name: rawRecorder?.profile?.full_name || "Member",
      items_summary: itemsSummary || "Ingredients used",
    };
  });

  // 13. Pending Shopping List Items (last 5)
  const { data: pendingShopRaw } = await supabase
    .from("shopping_list_items")
    .select(`
      id,
      quantity,
      unit,
      priority,
      custom_item_name,
      item:items(name)
    `)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false })
    .limit(5);

  const pendingShoppingItems = (pendingShopRaw || []).map((s) => {
    const rawItem = s.item as unknown as { name: string } | null;
    return {
      id: s.id,
      name: rawItem?.name || s.custom_item_name || "Grocery Item",
      quantity: Number(s.quantity),
      unit: s.unit,
      priority: s.priority,
    };
  });

  // 14. Member contributions summary
  const defaultMonthly = Number(acc?.default_monthly_contribution || 0);
  const memberContributionsSummary = (members || []).map((m) => {
    const rawProfile = m.profile as unknown as { full_name: string } | null;
    const memberPaid = (contribs || [])
      .filter((c) => c.member_id === m.id)
      .reduce((sum, c) => sum + Number(c.amount), 0);

    return {
      name: rawProfile?.full_name || "Member",
      paid: memberPaid,
      expected: defaultMonthly,
    };
  });

  return {
    totalMembers,
    monthlyExpenses,
    commonFundBalance,
    monthlyContributions,
    totalInventoryItems,
    lowStockCount,
    pendingSettlementCount,
    monthlyBudget: Number(acc?.monthly_budget || 0),
    currency: acc?.currency || "INR",
    expenseTrend,
    categoryBreakdown,
    recentPurchases,
    recentConsumption,
    lowStockItems,
    pendingShoppingItems,
    memberContributionsSummary,
  };
}

