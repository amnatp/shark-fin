// Centralized permission helpers for role-based visibility
export function canViewCost(user){
  if(!user) return false;
  const role = String(user.role||'');
  const lower = role.toLowerCase();
  // Explicit allow-list: Pricing, Director, Marketing
  if(lower === 'pricing' || lower === 'director' || lower === 'marketing') return true;
  return false;
}

export function canViewRos(user){
  if(!user) return false;
  const role = String(user.role||'');
  const lower = role.toLowerCase();
  // SalesManager explicitly allowed to see ROS; also any cost viewers may see ROS
  if(lower === 'salesmanager' || lower === 'regionmanager') return true;
  return canViewCost(user);
}

// Convenience negations
export function hideCostFor(user){ return !canViewCost(user); }
export function hideRosFor(user){ return !canViewRos(user); }
