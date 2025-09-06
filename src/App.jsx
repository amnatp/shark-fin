import { useState } from 'react';
import ListAltIcon from '@mui/icons-material/ListAlt';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import AuditTrailViewer from './AuditTrailViewer';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, CssBaseline, Divider, Badge, Menu, MenuItem, Tooltip, useMediaQuery, useTheme } from '@mui/material';
// Chevron toggles removed; top AppBar menu icon controls collapse now
import NotificationsIcon from '@mui/icons-material/Notifications';
import MenuIcon from '@mui/icons-material/Menu';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TableViewIcon from '@mui/icons-material/TableView';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import GavelIcon from '@mui/icons-material/Gavel';
import ArticleIcon from '@mui/icons-material/Article';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import SearchIcon from '@mui/icons-material/ManageSearch';
import RateManagement from './rate-management';
import RateManagement2 from './rate-management-2';
import BundledRates from './bundled-rates';
import SettingsPage from './settings';
import { SettingsProvider } from './settings-context';
import AirlineRateEntry from './airline-rate-entry';
import InquiryManagement from './inquiry-management';
import InquiryEdit from './inquiry-edit';
import InquiryCart from './inquiry-cart';
import InquiryCartDetail from './inquiry-cart-detail';
import RateRequestDetail, { RateRequestsInbox } from './procurement-pricing-rate-requests';
import VendorLanding from './vendor-landing';
import Tariffs from './tariffs';
import LocalCharge from './local-charge';
import QuotationEdit from './quotation-edit';
import QuotationTemplateManager from './quotation-template-manager';
import QuotationList from './quotation-list';
import CustomerQuotationList from './customer-quotation-list';
import Dashboards from './dashboards';
import { AuthProvider, useAuth } from './auth-context';
import Login from './login';
import { CartProvider, useCart } from './cart-context';
import { RatesProvider } from './rates-context';
import './App.css';

const drawerWidth = 220;
const miniWidth = 64;

function Navigation({ mobileOpen, onToggle, collapsed }) {
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.role;
  const isVendor = role === 'Vendor';
  const isCustomer = role === 'Customer';
  const items = (
    isVendor
      ? [
          { label: 'Vendor RFQs', to: '/vendor', icon: <RequestQuoteIcon fontSize="small" />, tooltip:'Respond to RFQs and upload quotes' },
          // Rate Management hidden for Vendor per new restriction
        ]
      : isCustomer
      ? [
          { label: 'Quotations', to: '/quotations', icon: <DescriptionIcon fontSize="small" />, tooltip:'View quotes shared with you' },
        ]
      : [
          { label: 'Inquiry Cart', to: '/inquiry-cart', icon: <ShoppingCartIcon fontSize="small" />, tooltip:'Build an inquiry by adding lanes & charges' },
          { label: 'Inquiry Management', to: '/inquiries', icon: <SearchIcon fontSize="small" />, tooltip:'Track inquiries through the pipeline' },
          { label: 'Quotations', to: '/quotations', icon: <DescriptionIcon fontSize="small" />, tooltip:'Manage draft and sent quotations' },
          { label: 'Quotation Templates', to: '/templates/quotation', icon: <ArticleIcon fontSize="small" />, tooltip:'Configure your quotation document templates' },
          (role==='Pricing' || role==='Sales') && { label: 'Pricing Requests', to: '/pricing/requests', icon: <PriceChangeIcon fontSize="small" />, tooltip:'Inbox for vendor/pricing responses' },
          role==='Director' && { label: 'Approvals', to: '/approvals', icon: <GavelIcon fontSize="small" />, tooltip:'Approve or reject pending items' },
          role==='Director' && { label: 'Settings', to: '/settings', icon: <SettingsIcon fontSize="small" />, tooltip:'Administration and app settings' },
          // Rate Management now restricted to Pricing & Director only
          (role==='Pricing' || role==='Director') && { label: 'Rate Management', to: '/rates', icon: <LocalShippingIcon fontSize="small" />, tooltip:'Manage carrier base rates and surcharges' },
          (role==='Pricing' || role==='Director') && { label: 'Rate Management 2', to: '/rates2', icon: <TableViewIcon fontSize="small" />, tooltip:'Alternate rate management interface' },
          (role==='Pricing' || role==='Director') && { label: 'Bundled Rates', to: '/bundles', icon: <AllInboxIcon fontSize="small" />, tooltip:'Create and manage rate bundles' },
          (role==='Pricing' || role==='Director') && { label: 'Dashboards', to: '/dashboards', icon: <DashboardIcon fontSize="small" />, tooltip:'Performance analytics and widgets' },
          { label: 'Local Charges', to: '/charges/local', icon: <ReceiptLongIcon fontSize="small" />, tooltip:'Origin/Destination/Optional local charges' },
          { label: 'Tariff Surcharges', to: '/tariffs', icon: <LibraryBooksIcon fontSize="small" />, tooltip:'Carrier surcharges with patterns' },
        ]
  ).filter(Boolean);
  const effectiveWidth = collapsed ? miniWidth : drawerWidth;
  return (
    <Box component="nav" sx={{ width: { sm: effectiveWidth }, flexShrink: { sm: 0 } }} aria-label="navigation menu">
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onToggle}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
      >
  <MenuContent items={items} currentPath={location.pathname} onItemClick={onToggle} collapsed={false} />
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { width: effectiveWidth, boxSizing: 'border-box', overflowX:'hidden' } }}
        open
      >
  <MenuContent items={items} currentPath={location.pathname} collapsed={collapsed} />
      </Drawer>
    </Box>
  );
}

function MenuContent({ items, currentPath, onItemClick, collapsed }) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ gap: 1, background: 'linear-gradient(135deg,#0d203a,#143d66)', color:'#fff', minHeight:{ xs:52, sm:56 }, py:0, justifyContent: collapsed? 'center':'flex-start' }}>
  <Box component={Link} to="/" sx={{ display:'flex', alignItems:'center', textDecoration:'none', color:'inherit', gap:1, flexGrow:1, justifyContent: collapsed? 'center':'flex-start' }} onClick={onItemClick}>
          <Box sx={{ background:'#fff', p:0.5, borderRadius:1, display:'flex', alignItems:'center', boxShadow:'0 0 0 1px rgba(255,255,255,0.15)' }}>
            <Box component="img" src="/images/wice-logo.png" alt="SharkFin logo" sx={{ height:28, width:'auto', display:'block' }} />
          </Box>
          {!collapsed && <Typography variant="h6" fontWeight={600} sx={{ fontSize:16, letterSpacing:.5 }}>SharkFin</Typography>}
        </Box>
      </Toolbar>
      <Divider />
      <List dense sx={{ px: collapsed? 0: 0 }}>
        {items.map(item => {
          const selected = currentPath.startsWith(item.to);
            return (
              <Tooltip key={item.to} title={item.tooltip || item.label} placement={collapsed ? 'right' : 'bottom-start'} arrow>
                <ListItemButton component={Link} to={item.to} onClick={onItemClick} selected={selected} sx={{ px: collapsed? 1: 2, justifyContent: collapsed? 'center':'flex-start' }}>
                  <ListItemIcon sx={{ minWidth: collapsed? 0: 34, justifyContent:'center' }}>{item.icon}</ListItemIcon>
                  {!collapsed && <ListItemText primaryTypographyProps={{ fontSize: 14 }} primary={item.label} />}
                </ListItemButton>
              </Tooltip>
            );
        })}
      </List>
      <Box flexGrow={1} />
      {!collapsed && <Box p={2} sx={{ fontSize: 11, color: 'text.secondary' }}>© 2025 SharkFin</Box>}
    </Box>
  );
}

function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(()=>{ try { return JSON.parse(localStorage.getItem('navCollapsed')||'false'); } catch { return false; } });
  const toggleCollapsed = () => {
    setCollapsed(c => {
      const next = !c; try { localStorage.setItem('navCollapsed', JSON.stringify(next)); } catch{ /* ignore */ }
      return next;
    });
  };
  const toggle = () => setMobileOpen(o => !o);
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const { items } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
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
  // Role-based root landing redirects
  if(location.pathname==='/' ){
    if(user?.role==='Vendor') navigate('/vendor', { replace:true });
    else if(user?.role==='Customer') navigate('/quotations', { replace:true }); // Customer lands on customer-quotation-list via QuotationsSwitch
  }
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} color="primary" enableColorOnDark>
  <Toolbar sx={{ background:'linear-gradient(135deg,#0b1b33,#15426d)', minHeight:{ xs:52, sm:56 }, py:0 }}>
          <IconButton color="inherit" edge="start" onClick={()=>{ isSmUp ? toggleCollapsed() : toggle(); }} sx={{ mr: 1 }} title={isSmUp ? (collapsed? 'Expand menu':'Collapse menu') : 'Menu'}>
            <MenuIcon />
          </IconButton>
          <Box component={Link} to="/" sx={{ display:'flex', alignItems:'center', textDecoration:'none', color:'inherit', mr:2, gap:1 }}>
            <Box sx={{ background:'#fff', p:0.5, borderRadius:1, display:'flex', alignItems:'center', boxShadow:'0 0 0 1px rgba(255,255,255,0.15)' }}>
              <Box component="img" src="/images/wice-logo.png" alt="SharkFin logo" sx={{ height:24, width:'auto', display:'block' }} />
            </Box>
            <Typography variant="h6" component="div" sx={{ fontSize: 16, fontWeight:600, letterSpacing:.4 }}>SharkFin - Freight Sales Platform</Typography>
          </Box>
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
  <Navigation mobileOpen={mobileOpen} onToggle={toggle} collapsed={collapsed} />
  <Box component="main" sx={{ flexGrow: 1, p: 2, width: { sm: `calc(100% - ${(collapsed? miniWidth: drawerWidth)}px)` }, pt: { xs:'60px', sm:'60px' } }}>
        <Routes>
          <Route path="/" element={<RequireAuth><RateManagement /></RequireAuth>} />
          <Route path="/login" element={<Login />} />
          <Route path="/rates" element={<RequireAuth roles={['Pricing','Director']}><RateManagement /></RequireAuth>} />
          <Route path="/rates2" element={<RequireAuth roles={['Pricing','Director']}><RateManagement2 /></RequireAuth>} />
          <Route path="/bundles" element={<RequireAuth roles={['Pricing','Director']}><BundledRates /></RequireAuth>} />
          <Route path="/dashboards" element={<RequireAuth roles={['Pricing','Director']}><Dashboards /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth roles={['Director']}><SettingsPage /></RequireAuth>} />
          <Route path="/airline-rate-entry" element={<RequireAuth roles={['Sales','Pricing','Director']}><AirlineRateEntry /></RequireAuth>} />
          <Route path="/airline-rate-entry/:id" element={<RequireAuth roles={['Sales','Pricing','Director']}><AirlineRateEntry /></RequireAuth>} />
          <Route path="/inquiries" element={<RequireAuth roles={['Sales','Pricing','Director']}><InquiryManagement /></RequireAuth>} />
          <Route path="/inquiry/:id" element={<RequireAuth roles={['Sales','Pricing','Director']}><InquiryEdit /></RequireAuth>} />
          <Route path="/inquiry-cart" element={<InquiryCart />} />
          <Route path="/inquiry-cart-detail" element={<InquiryCartDetail />} />
          <Route path="/pricing/requests" element={<RequireAuth roles={['Pricing','Sales']}><RateRequestsInbox /></RequireAuth>} />
          <Route path="/pricing/request/:id" element={<RequireAuth roles={['Pricing','Sales','Vendor']}><RateRequestDetail /></RequireAuth>} />
          <Route path="/vendor" element={<RequireAuth roles={['Vendor']}><VendorLanding /></RequireAuth>} />
          <Route path="/sales/request/:id" element={<RequireAuth roles={['Sales','Director']}><RateRequestDetail /></RequireAuth>} />
          <Route path="/sales/request/preview" element={<RequireAuth roles={['Sales','Director']}><RateRequestDetail /></RequireAuth>} />
          <Route path="/tariffs" element={<RequireAuth roles={['Sales','Pricing','Director']}><Tariffs /></RequireAuth>} />
          <Route path="/charges/local" element={<RequireAuth roles={['Sales','Pricing','Director']}><LocalCharge /></RequireAuth>} />
          <Route path="/templates/quotation" element={<RequireAuth roles={['Sales','Pricing','Director']}><QuotationTemplateManager /></RequireAuth>} />
          <Route path="/quotations" element={<RequireAuth roles={['Sales','Pricing','Director','Customer']}><QuotationsSwitch /></RequireAuth>} />
          <Route path="/quotations/new" element={<RequireAuth roles={['Sales','Pricing','Director']}><QuotationEdit /></RequireAuth>} />
          <Route path="/quotations/:id" element={<RequireAuth roles={['Sales','Pricing','Director','Customer']}><QuotationEdit /></RequireAuth>} />
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

function QuotationsSwitch(){
  const { user } = useAuth();
  if(user?.role === 'Customer') return <CustomerQuotationList />;
  return <QuotationList />;
}

export default function App(){
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <RatesProvider>
            <CartProvider>
              <Shell />
            </CartProvider>
          </RatesProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
