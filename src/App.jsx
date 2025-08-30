import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, CssBaseline, Divider, Badge } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SearchIcon from '@mui/icons-material/ManageSearch';
import RateManagement from './rate-management';
import InquiryManagement from './inquiry-management';
import InquiryEdit from './inquiry-edit';
import InquiryCart from './inquiry-cart';
import InquiryCartDetail from './inquiry-cart-detail';
import RateRequestDetail, { RateRequestsInbox } from './procurement-pricing-rate-requests';
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
    { label: 'Rate Management', to: '/rates', icon: <AssessmentIcon fontSize="small" /> },
    { label: 'Inquiry Management', to: '/inquiries', icon: <SearchIcon fontSize="small" /> },
    { label: 'Inquiry Cart', to: '/inquiry-cart', icon: <SearchIcon fontSize="small" /> },
    { label: 'Cart Detail', to: '/inquiry-cart-detail', icon: <ShoppingCartIcon fontSize="small" /> },
    // Role-based
  (role==='Pricing' || role==='Sales') && { label: 'Pricing Requests', to: '/pricing/requests', icon: <AssessmentIcon fontSize="small" /> },
    role==='Director' && { label: 'Approvals', to: '/approvals', icon: <AssessmentIcon fontSize="small" /> },
  ];
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
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} color="primary" enableColorOnDark>
        <Toolbar variant="dense">
          <IconButton color="inherit" edge="start" onClick={toggle} sx={{ mr: 1, display: { sm: 'none' } }}><MenuIcon /></IconButton>
          <Typography variant="h6" component="div" sx={{ fontSize: 16 }}>Operations Portal</Typography>
          <Box flexGrow={1} />
          <IconButton color="inherit" onClick={()=>navigate('/inquiry-cart-detail')}>
            <Badge color="error" badgeContent={items.length} invisible={items.length===0}><ShoppingCartIcon /></Badge>
          </IconButton>
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
          <Route path="/inquiries" element={<RequireAuth roles={['Sales','Pricing','Director']}><InquiryManagement /></RequireAuth>} />
          <Route path="/inquiry/:id" element={<RequireAuth roles={['Sales','Pricing','Director']}><InquiryEdit /></RequireAuth>} />
          <Route path="/inquiry-cart" element={<InquiryCart />} />
          <Route path="/inquiry-cart-detail" element={<InquiryCartDetail />} />
          <Route path="/pricing/requests" element={<RequireAuth roles={['Pricing','Sales']}><RateRequestsInbox /></RequireAuth>} />
          <Route path="/pricing/request/:id" element={<RequireAuth roles={['Pricing','Sales']}><RateRequestDetail /></RequireAuth>} />
          <Route path="/sales/request/:id" element={<RequireAuth roles={['Sales','Director']}><RateRequestDetail /></RequireAuth>} />
          <Route path="/sales/request/preview" element={<RequireAuth roles={['Sales','Director']}><RateRequestDetail /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
  return <BrowserRouter><AuthProvider><CartProvider><Shell /></CartProvider></AuthProvider></BrowserRouter>;
}
