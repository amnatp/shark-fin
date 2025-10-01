// Centralized permission helpers for role-based visibility
export function canViewCost(user){
  if(!user) return false;
  const role = String(user.role||'');
  const lower = role.toLowerCase();
  // Admins can always view cost
  if(lower === 'admin') return true;
  // Explicit allow-list: Pricing, Director, Marketing
  if(lower === 'pricing' || lower === 'director' || lower === 'marketing') return true;
  return false;
}

export function canViewRos(user){
  if(!user) return false;
  const role = String(user.role||'');
  const lower = role.toLowerCase();
  // SalesManager explicitly allowed to see ROS; also any cost viewers may see ROS
  if(lower === 'salesmanager' || lower === 'regionmanager' || lower === 'admin') return true;
  return canViewCost(user);
}

// Convenience negations
export function hideCostFor(user){ return !canViewCost(user); }
export function hideRosFor(user){ return !canViewRos(user); }

// Hide margin column for Sales and Customer roles (sensitive internal info)
export function hideMarginFor(user){
  if(!user) return true;
  const role = String(user.role||'').toLowerCase();
  // Sales and Customer must not see margin
  if(role === 'sales' || role === 'customer') return true;
  // Others follow cost visibility: if they cannot view cost, they should not see margin either
  return !canViewCost(user);
}

// Visibility for Sell (selling price) column. Sales users must always see Sell.
export function canViewSell(user){
  if(!user) return false;
  const role = String(user.role||'').toLowerCase();
  // Sales should always see Sell. Pricing, Admin and managers also should.
  // UPDATE: Customers should also see selling price (same as salesperson).
  if(role === 'sales' || role === 'customer' || role === 'pricing' || role === 'admin' || role === 'director' || role === 'marketing' || role === 'salesmanager' || role === 'regionmanager') return true;
  // Vendors and anonymous users should not.
  return false;
}

export function hideSellFor(user){ return !canViewSell(user); }
