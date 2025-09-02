import { useState } from 'react';
import ListAltIcon from '@mui/icons-material/ListAlt';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import AuditTrailViewer from './AuditTrailViewer';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, CssBaseline, Divider, Badge, Menu, MenuItem, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MenuIcon from '@mui/icons-material/Menu';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SearchIcon from '@mui/icons-material/ManageSearch';
import RateManagement from './rate-management';
import SettingsPage from './settings';
import { SettingsProvider } from './settings-context';
import AirlineRateEntry from './airline-rate-entry';
import InquiryManagement from './inquiry-management';
import InquiryEdit from './inquiry-edit';
import InquiryCart from './inquiry-cart';
import InquiryCartDetail from './inquiry-cart-detail';
import RateRequestDetail, { RateRequestsInbox } from './procurement-pricing-rate-requests';
import TariffLibrary from './tariff-library';
import QuotationEdit from './quotation-edit';
import QuotationTemplateManager from './quotation-template-manager';
import QuotationList from './quotation-list';
import { AuthProvider, useAuth } from './auth-context';
import Login from './login';
import { CartProvider, useCart } from './cart-context';
import './App.css';

const drawerWidth = 220;

function Navigation({ mobileOpen, onToggle }) {
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.role;
  const items = [
  // Core workflow screens (excluding Rate Management & Tariff which are moved to bottom)
  { label: 'Inquiry Cart', to: '/inquiry-cart', icon: <SearchIcon fontSize="small" /> },
  // Removed 'Cart Detail' from menu per request (route still accessible via cart icon)
  { label: 'Inquiry Management', to: '/inquiries', icon: <SearchIcon fontSize="small" /> },
  { label: 'Quotations', to: '/quotations', icon: <AssessmentIcon fontSize="small" /> },
  { label: 'Quotation Templates', to: '/templates/quotation', icon: <AssessmentIcon fontSize="small" /> },
    // Role-based
    (role==='Pricing' || role==='Sales') && { label: 'Pricing Requests', to: '/pricing/requests', icon: <AssessmentIcon fontSize="small" /> },
    role==='Director' && { label: 'Approvals', to: '/approvals', icon: <AssessmentIcon fontSize="small" /> },
  // Settings (Director only for prototype)
  role==='Director' && { label: 'Settings', to: '/settings', icon: <AssessmentIcon fontSize="small" /> },
  // Place Rate Management second last
  { label: 'Rate Management', to: '/rates', icon: <AssessmentIcon fontSize="small" /> },
  // Tariff Library bottom-most
  { label: 'Tariff Library', to: '/tariffs', icon: <AssessmentIcon fontSize="small" /> },
  ].filter(Boolean);
  return (
    <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} aria-label="navigation menu">
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onToggle}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
      >
        <MenuContent items={items} currentPath={location.pathname} onItemClick={onToggle} />
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}
        open
      >
        <MenuContent items={items} currentPath={location.pathname} />
      </Drawer>
    </Box>
  );
}

function MenuContent({ items, currentPath, onItemClick }) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar><Typography variant="h6" fontWeight={600}>SharkFin</Typography></Toolbar>
      <Divider />
      <List dense>
        {items.map(item => {
          const selected = currentPath.startsWith(item.to);
            return (
              <ListItemButton key={item.to} component={Link} to={item.to} onClick={onItemClick} selected={selected}>
                <ListItemIcon sx={{ minWidth: 34 }}>{item.icon}</ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 14 }} primary={item.label} />
              </ListItemButton>
            );
        })}
      </List>
      <Box flexGrow={1} />
      <Box p={2} sx={{ fontSize: 11, color: 'text.secondary' }}>© 2025 SharkFin</Box>
    </Box>
  );
}

function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggle = () => setMobileOpen(o => !o);
  const { items } = useCart();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [notifications, setNotifications] = useState(()=>{ try { return JSON.parse(localStorage.getItem('notifications')||'[]'); } catch { return []; } });
  const [auditOpen, setAuditOpen] = useState(false);
  // Refresh notifications on focus / storage
  // Only show those for current user & unread
  const userNotifs = notifications.filter(n=> n.user===user?.display || n.user===user?.id).filter(n=> !n.read);
  function openNotif(e){ setNotifAnchor(e.currentTarget); }
  function closeNotif(){ setNotifAnchor(null); }
  function markAll(){
    setNotifications(prev => {
      const next = prev.map(n=> (n.user===user?.display || n.user===user?.id)? { ...n, read:true } : n);
      try { localStorage.setItem('notifications', JSON.stringify(next)); } catch{/* ignore */}
      return next;
    });
    closeNotif();
  }
  // listen storage
  window.addEventListener('storage', ()=>{ try { setNotifications(JSON.parse(localStorage.getItem('notifications')||'[]')); } catch{ /* ignore parse errors */ } });
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} color="primary" enableColorOnDark>
        <Toolbar variant="dense">
          <IconButton color="inherit" edge="start" onClick={toggle} sx={{ mr: 1, display: { sm: 'none' } }}><MenuIcon /></IconButton>
          <Typography variant="h6" component="div" sx={{ fontSize: 16 }}>Operations Portal</Typography>
          <Box flexGrow={1} />
          <IconButton color="inherit" onClick={()=>setAuditOpen(true)} title="View Audit Trail">
            <ListAltIcon />
          </IconButton>
          <IconButton color="inherit" onClick={()=>navigate('/inquiry-cart-detail')}>
            <Badge color="error" badgeContent={items.length} invisible={items.length===0}><ShoppingCartIcon /></Badge>
          </IconButton>
          {user && (
            <IconButton color="inherit" onClick={openNotif} sx={{ ml:1 }}>
              <Badge color="error" badgeContent={userNotifs.length} invisible={!userNotifs.length}><NotificationsIcon /></Badge>
            </IconButton>
          )}
          <Menu anchorEl={notifAnchor} open={!!notifAnchor} onClose={closeNotif} PaperProps={{ sx:{ maxWidth:360, maxHeight:400 }}}>
            {!userNotifs.length && <MenuItem disabled><Typography variant="caption">No new notifications</Typography></MenuItem>}
            {userNotifs.slice(0,10).map(n=> (
              <MenuItem key={n.id} onClick={()=>{ navigate(`/inquiry/${n.inquiryId}`); markAll(); }} sx={{ whiteSpace:'normal', alignItems:'flex-start', py:1 }}>
                <Box display="flex" flexDirection="column" gap={0.5}>
                  <Typography variant="caption" fontWeight={600}>Rate Update • {n.inquiryId}</Typography>
                  <Typography variant="caption" color="text.secondary">{new Date(n.ts).toLocaleString()}</Typography>
                  <Typography variant="caption">{n.lines.length} line(s) updated. Primary: {n.lines.find(l=>l.chosenVendor)?.chosenVendor || n.lines[0]?.chosenVendor || '—'}</Typography>
                </Box>
              </MenuItem>
            ))}
            {!!userNotifs.length && <MenuItem onClick={markAll}><Typography variant="caption">Mark all as read</Typography></MenuItem>}
          </Menu>
          {user && <Box ml={2} display="flex" alignItems="center" gap={1}>
            <Typography variant="caption" sx={{ fontSize:12 }}>{user.display} ({user.role})</Typography>
            <IconButton size="small" color="inherit" onClick={()=>{ logout(); navigate('/login'); }}><span style={{fontSize:11}}>Logout</span></IconButton>
          </Box>}
        </Toolbar>
      </AppBar>
      <Navigation mobileOpen={mobileOpen} onToggle={toggle} />
      <Box component="main" sx={{ flexGrow: 1, p: 2, width: { sm: `calc(100% - ${drawerWidth}px)` }, mt: 5 }}>
        <Routes>
          <Route path="/" element={<RequireAuth><RateManagement /></RequireAuth>} />
          <Route path="/login" element={<Login />} />
          <Route path="/rates" element={<RateManagement />} />
          <Route path="/settings" element={<RequireAuth roles={['Director']}><SettingsPage /></RequireAuth>} />
          <Route path="/airline-rate-entry" element={<RequireAuth roles={['Sales','Pricing','Director']}><AirlineRateEntry /></RequireAuth>} />
          <Route path="/airline-rate-entry/:id" element={<RequireAuth roles={['Sales','Pricing','Director']}><AirlineRateEntry /></RequireAuth>} />
          <Route path="/inquiries" element={<RequireAuth roles={['Sales','Pricing','Director']}><InquiryManagement /></RequireAuth>} />
          <Route path="/inquiry/:id" element={<RequireAuth roles={['Sales','Pricing','Director']}><InquiryEdit /></RequireAuth>} />
          <Route path="/inquiry-cart" element={<InquiryCart />} />
          <Route path="/inquiry-cart-detail" element={<InquiryCartDetail />} />
          <Route path="/pricing/requests" element={<RequireAuth roles={['Pricing','Sales']}><RateRequestsInbox /></RequireAuth>} />
          <Route path="/pricing/request/:id" element={<RequireAuth roles={['Pricing','Sales']}><RateRequestDetail /></RequireAuth>} />
          <Route path="/sales/request/:id" element={<RequireAuth roles={['Sales','Director']}><RateRequestDetail /></RequireAuth>} />
          <Route path="/sales/request/preview" element={<RequireAuth roles={['Sales','Director']}><RateRequestDetail /></RequireAuth>} />
          <Route path="/tariffs" element={<RequireAuth roles={['Sales','Pricing','Director']}><TariffLibrary /></RequireAuth>} />
          <Route path="/templates/quotation" element={<RequireAuth roles={['Sales','Pricing','Director']}><QuotationTemplateManager /></RequireAuth>} />
          <Route path="/quotations" element={<RequireAuth roles={['Sales','Pricing','Director']}><QuotationList /></RequireAuth>} />
          <Route path="/quotations/new" element={<RequireAuth roles={['Sales','Pricing','Director']}><QuotationEdit /></RequireAuth>} />
          <Route path="/quotations/:id" element={<RequireAuth roles={['Sales','Pricing','Director']}><QuotationEdit /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AuditTrailViewer open={auditOpen} onClose={()=>setAuditOpen(false)} />
      </Box>
    </Box>
  );
}

function RequireAuth({ children, roles }){
  const { user } = useAuth();
  if(!user) return <Navigate to="/login" replace />;
  if(roles && !roles.includes(user.role)) return <Box p={3}><Typography variant="body2" color="error">Access denied for role {user.role}.</Typography></Box>;
  return children;
}

export default function App(){
  return <BrowserRouter><AuthProvider><SettingsProvider><CartProvider><Shell /></CartProvider></SettingsProvider></AuthProvider></BrowserRouter>;
}
