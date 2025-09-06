/* eslint-disable react-refresh/only-export-components */
import React from 'react';

const AuthContext = React.createContext(null);

// Base user directory with org hierarchy fields:
// region -> location -> team -> member; each member can have a supervisor (fishhook up-chain)
const USERS = [
  // Region Manager
  { username: 'regionmanager.pete', display: 'Region Manager Pete', region: 'APAC', location: 'APAC-HQ', team: 'Regional', supervisor: null },
  // Sales Manager (reports to region manager)
  { username: 'salesmanager.top', display: 'Sales Manager Top', region: 'APAC', location: 'BKK', team: 'Sales', supervisor: 'regionmanager.pete' },
  { username: 'salesmanager.mike', display: 'Sales Manager Mike', region: 'APAC', location: 'SHA', team: 'Sales', supervisor: 'regionmanager.pete' },
  // Sales reps (report to sales manager)
  { username: 'sales.chan', display: 'Sales Chan', customers:['CUSTA','CUSTB'], region: 'APAC', location: 'BKK', team: 'Sales', supervisor: 'salesmanager.top' }, // Bangkok
  { username: 'sales.mei', display: 'Sales Mei', customers:['CUSTC'], region: 'APAC', location: 'SHA', team: 'Sales', supervisor: 'salesmanager.mike' }, // Shanghai (now reporting to Sales Manager Mike)
  // Other functional roles
  { username: 'pricing.pim', display: 'Pricing Pim', region: 'APAC', location: 'BKK', team: 'Pricing', supervisor: 'regionmanager.pete' },
  { username: 'director.dan', display: 'Director Dan', region: 'APAC', location: 'BKK', team: 'Executive', supervisor: null },
  { username: 'vendor.vin', display: 'Vendor Vin', region: 'APAC', location: 'BKK', team: 'Vendor', carrierLink: 'CMA CGM', supervisor: null },
  { username: 'customer.ace', display: 'Customer ACE Logistics', customerCode: 'CUSTA', region: 'APAC', location: 'BKK', team: 'Customer', supervisor: null },
];

function deriveRole(username){
  if(username.startsWith('salesmanager.')) return 'SalesManager';
  if(username.startsWith('regionmanager.')) return 'RegionManager';
  if(username.startsWith('sales.')) return 'Sales';
  if(username.startsWith('pricing.')) return 'Pricing';
  if(username.startsWith('director.')) return 'Director';
  if(username.startsWith('vendor.')) return 'Vendor';
  if(username.startsWith('customer.')) return 'Customer';
  return 'Guest';
}

// Build an organization tree for convenience (region -> locations -> teams -> members)
function buildOrgTree(users){
  const regions = {};
  users.forEach(u=>{
    const r = u.region || 'UNASSIGNED';
    if(!regions[r]) regions[r] = { code:r, locations:{} };
    const loc = u.location || 'UNKNOWN';
    if(!regions[r].locations[loc]) regions[r].locations[loc] = { code:loc, teams:{} };
    const team = u.team || 'General';
    if(!regions[r].locations[loc].teams[team]) regions[r].locations[loc].teams[team] = { code:team, members:[] };
    regions[r].locations[loc].teams[team].members.push(u.username);
  });
  return regions;
}

// Precompute supervisor chains (fishhook) for quick lookup
function buildSupervisorChains(users){
  const map = Object.fromEntries(users.map(u=>[u.username,u]));
  const chains = {};
  users.forEach(u=>{
    const chain = [];
    let cursor = u.supervisor;
    const visited = new Set();
    while(cursor && map[cursor] && !visited.has(cursor)){
      chain.push(cursor);
      visited.add(cursor);
      cursor = map[cursor].supervisor;
    }
    chains[u.username] = chain; // ordered bottom-up
  });
  return chains;
}

export function AuthProvider({ children }){
  const [user, setUser] = React.useState(()=>{
    try { return JSON.parse(localStorage.getItem('currentUser')||'null'); } catch { return null; }
  });
  const login = (username) => {
    const template = USERS.find(u=> u.username===username);
    if(template){
  const full = { ...template, role: deriveRole(template.username), allowedCustomers: template.customers|| (template.customerCode? [template.customerCode]: null) };
      setUser(full); localStorage.setItem('currentUser', JSON.stringify(full));
    } else if(username){
      const dynamic = { username, display: username, role: deriveRole(username), allowedCustomers:null };
      setUser(dynamic); localStorage.setItem('currentUser', JSON.stringify(dynamic));
    }
  };
  const logout = () => { setUser(null); localStorage.removeItem('currentUser'); };
  const enrichedUsers = React.useMemo(()=> USERS.map(u=> ({
    ...u,
    role: deriveRole(u.username),
    allowedCustomers: u.customers || (u.customerCode? [u.customerCode]: null)
  })), []);
  const organization = React.useMemo(()=> ({
    regions: buildOrgTree(enrichedUsers),
    supervisorChains: buildSupervisorChains(enrichedUsers)
  }), [enrichedUsers]);
  return <AuthContext.Provider value={{ user, login, logout, USERS: enrichedUsers, organization }}>{children}</AuthContext.Provider>;
}
export function useAuth(){ return React.useContext(AuthContext); }
