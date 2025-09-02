// Centralized calculation helpers for sell/margin/ROS and unit normalization.
// Keeps business math consistent across cart, inquiries, quotations.

export function teuFactor(containerType = "") {
  const ct = (containerType || "").toUpperCase();
  if (ct.includes("20")) return 1;
  if (ct.includes("45")) return 2.25;
  if (ct.includes("53")) return 2.65;
  if (ct.includes("40")) return 2; // 40' incl 40HC
  return 1; // default fall-back
}

export function computeLineRos(sell, margin) {
  if (!sell) return 0;
  return (margin / sell) * 100;
}

export function computeTotals(items = []) {
  let sell = 0, margin = 0;
  let containers = 0, teu = 0, kg = 0;
  for (const i of items) {
    const qty = i.qty || 1;
    const lineSell = (i.sell || 0) * qty;
    const lineMargin = (i.margin || 0) * qty;
    sell += lineSell;
    margin += lineMargin;
    const basis = (i.basis || "").toLowerCase();
    if (basis.includes("container")) {
      containers += qty;
      teu += teuFactor(i.containerType) * qty;
    } else if (basis.includes("kg")) {
      kg += qty;
    }
  }
  const ros = computeLineRos(sell, margin);
  return { sell, margin, ros, units: { containers, teu, kg } };
}

// Utility to format monetary values (placeholder for future currency settings)
export function formatMoney(value, decimals = 2) {
  return Number(value || 0).toFixed(decimals);
}
