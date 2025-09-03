import { createTheme } from '@mui/material/styles';

// Central theme overrides for a cleaner, denser operations UI.
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#15426d' },
    secondary: { main: '#0d203a' },
    background: { default: '#f5f7fa', paper: '#ffffff' },
    divider: 'rgba(0,0,0,0.08)'
  },
  typography: {
    fontFamily: 'Inter, system-ui, Roboto, Helvetica, Arial, sans-serif',
    h6: { fontWeight: 600 },
    caption: { lineHeight: 1.3 }
  },
  shape: { borderRadius: 6 },
  components: {
    MuiAppBar: {
      styleOverrides: { root: { boxShadow: '0 2px 4px rgba(0,0,0,0.25)' } }
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } }
    },
    MuiTableHead: {
      styleOverrides: { root: { background: 'linear-gradient(90deg,#0d203a,#15426d)', '& th': { color:'#fff', fontWeight:600, fontSize:12, paddingTop:6, paddingBottom:6 } } }
    },
    MuiTableCell: {
      styleOverrides: { root: { paddingTop:4, paddingBottom:4 } }
    },
    MuiButton: {
      styleOverrides: { root: { textTransform:'none', fontWeight:600, letterSpacing:.3 } },
      defaultProps: { size:'small' }
    },
    MuiTextField: {
      defaultProps: { size:'small' }
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { fontSize:11 } }
    }
  }
});

export default theme;