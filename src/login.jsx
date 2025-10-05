import React from 'react';
import { Box, Card, CardContent, Typography, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth-context';

export default function Login(){
  const { user, login, USERS } = useAuth();
  const [username, setUsername] = React.useState(user?.username || USERS[0].username);
  const navigate = useNavigate();
  function handleLogin(){ login(username); navigate('/'); }
  return (
    <Box minHeight="100vh" display="flex" justifyContent="center" alignItems="center" p={2}>
      <Card sx={{ width: 380 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Login (Prototype)</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>Pick a predefined user (role is derived from username).</Typography>
          <ToggleButtonGroup exclusive value={username} onChange={(e,v)=> v && setUsername(v)} fullWidth size="small" sx={{ mb:2, flexWrap:'wrap' }}>
            {USERS.map(u=> <ToggleButton key={u.username} value={u.username}>{u.username}</ToggleButton>)}
          </ToggleButtonGroup>
          <Button fullWidth variant="contained" onClick={handleLogin}>Login</Button>
          <Box mt={2}>
            <Typography variant="caption" color="text.secondary">Users: {USERS.map(u=>u.username+"→"+u.role).join(', ')}</Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
