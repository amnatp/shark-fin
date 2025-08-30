import React from 'react';

const AuthContext = React.createContext(null);

const USERS = [
  { username: 'sales.chan', display: 'Sales Chan' },
  { username: 'pricing.pim', display: 'Pricing Pim' },
  { username: 'director.dan', display: 'Director Dan' },
  { username: 'vendor.vin', display: 'Vendor Vin' },
];

function deriveRole(username){
  if(username.startsWith('sales.')) return 'Sales';
  if(username.startsWith('pricing.')) return 'Pricing';
  if(username.startsWith('director.')) return 'Director';
  if(username.startsWith('vendor.')) return 'Vendor';
  return 'Guest';
}

export function AuthProvider({ children }){
  const [user, setUser] = React.useState(()=>{
    try { return JSON.parse(localStorage.getItem('currentUser')||'null'); } catch { return null; }
  });
  const login = (username) => {
    const template = USERS.find(u=> u.username===username);
    if(template){
      const full = { ...template, role: deriveRole(template.username) };
      setUser(full); localStorage.setItem('currentUser', JSON.stringify(full));
    } else if(username){
      const dynamic = { username, display: username, role: deriveRole(username) };
      setUser(dynamic); localStorage.setItem('currentUser', JSON.stringify(dynamic));
    }
  };
  const logout = () => { setUser(null); localStorage.removeItem('currentUser'); };
  return <AuthContext.Provider value={{ user, login, logout, USERS: USERS.map(u=> ({ ...u, role: deriveRole(u.username) })) }}>{children}</AuthContext.Provider>;
}
export function useAuth(){ return React.useContext(AuthContext); }
