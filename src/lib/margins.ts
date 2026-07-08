/**
 * NOVSMM — Margin Structure
 *
 * PROFIT MODEL:
 * ──────────────────────────────────────────────────────
 * Provider cost:  $1.00 (lo que HuntSMM cobra)
 * NOVSMM markup:  150% del costo
 * Sale price:     $2.50 (cost × 2.5)
 * NOVSMM profit:  $1.50 (150% del costo)
 *
 * DIRECT SALES (NOVSMM → end user):
 *   NOVSMM keeps: $1.50 (100% del profit)
 *
 * MARKETPLACE SALES (reseller → end user):
 *   Price:        $2.50 (mismo precio)
 *   Reseller gets: $0.75 (50% del profit de NOVSMM)
 *   NOVSMM keeps:  $0.75 (50% del profit) + $1.00 (cost recovery)
 *   Total NOVSMM: $1.75
 *
 * CHILD PANEL SALES:
 *   Price:        $2.50 × (1 + childMarkup)
 *   Child panel owner gets: 50% del profit de NOVSMM
 *   NOVSMM keeps: 50% del profit + cost recovery
 * ──────────────────────────────────────────────────────
 */

// ── Direct sale: NOVSMM profit = 150% of cost ──
export const NOVSMM_MARKUP_PERCENT = 150; // 150% markup on cost
export function calculateDirectPrice(cost: number): number {
  return cost * (1 + NOVSMM_MARKUP_PERCENT / 100); // cost × 2.5
}
export function calculateDirectProfit(cost: number): number {
  return cost * (NOVSMM_MARKUP_PERCENT / 100); // cost × 1.5
}

// ── Marketplace: 50/50 profit split ──
export const MARKETPLACE_PROFIT_SPLIT = 0.5; // reseller gets 50% of NOVSMM's profit
export function calculateMarketplaceProfit(cost: number): {
  totalProfit: number;
  novsmmProfit: number;
  resellerProfit: number;
} {
  const totalProfit = calculateDirectProfit(cost); // 150% of cost
  const resellerProfit = totalProfit * MARKETPLACE_PROFIT_SPLIT; // 75% of cost
  const novsmmProfit = totalProfit - resellerProfit; // 75% of cost
  return { totalProfit, novsmmProfit, resellerProfit };
}

// ── Child Panel: same 50/50 profit split ──
export const CHILD_PANEL_PROFIT_SPLIT = 0.5; // child panel owner gets 50% of NOVSMM's profit
export function calculateChildPanelPrice(cost: number): number {
  // Child panel price = cost + NOVSMM profit + child panel profit
  // = cost + (150% × 50%) + (150% × 50%)
  // = cost + 75% + 75%
  // = cost × 2.5 (same as direct, but profit is split)
  return calculateDirectPrice(cost);
}
export function calculateChildPanelProfit(cost: number): {
  totalProfit: number;
  novsmmProfit: number;
  childPanelProfit: number;
} {
  const totalProfit = calculateDirectProfit(cost);
  const childPanelProfit = totalProfit * CHILD_PANEL_PROFIT_SPLIT;
  const novsmmProfit = totalProfit - childPanelProfit;
  return { totalProfit, novsmmProfit, childPanelProfit };
}

// ── Example ──
// Cost: $1.00
// Direct price: $2.50
// Direct profit: $1.50 (NOVSMM keeps 100%)
// Marketplace: reseller gets $0.75, NOVSMM gets $0.75 profit + $1.00 cost = $1.75
// Child panel: child owner gets $0.75, NOVSMM gets $0.75 profit + $1.00 cost = $1.75
