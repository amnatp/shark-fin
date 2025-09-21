import React from 'react';
import { Box, Fab, Dialog, DialogTitle, DialogContent, IconButton, TextField, Button, Typography, Avatar } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

// Floating chat widget that mimics the provided screenshot style and performs a mock
// question flow to produce suggested charges. Uses onApply(suggestedCharges) to return results.

export default function AIChatWidget({ onApply }){
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [stage, setStage] = React.useState(0);

  React.useEffect(()=>{
    if(open){
      setMessages([{ from:'bot', text:'Let us help! What service are you looking for? (e.g. Sea FCL, Air, Customs)' }]);
      setStage(1);
    }else{
      setMessages([]); setStage(0); setInput('');
    }
  }, [open]);

  function push(msg){ setMessages(m=>[...m, msg]); }

  function handleSend(){
    const text = (input||'').trim(); if(!text) return; push({ from:'user', text }); setInput('');
    if(stage===1){ // got service
      push({ from:'bot', text:'Do you require customs clearance at origin or destination? (yes/no)' });
      setStage(2);
      // store in messages for conversion
    } else if(stage===2){
      push({ from:'bot', text:'Any origin or destination specifics? (e.g. THBKK, USLAX) — or type "no"' });
      setStage(3);
    } else if(stage===3){
      // perform mock conversion: create 2-3 suggested charges based on user answers collected from messages
      const convo = [...messages, { from:'user', text }].map(m=> m.text).join(' | ');
      const suggested = [
        { id:`C-${Date.now()}-1`, name:'BAF (Fuel Surcharge)', basis:'Per Container', qty:1, sell:150, margin:0, notes:`Suggested — ${convo}` },
        { id:`C-${Date.now()}-2`, name:'Documentation Fee', basis:'Per B/L', qty:1, sell:40, margin:0, notes:`Suggested — ${convo}` }
      ];
      push({ from:'bot', text:`I found ${suggested.length} suggested charges. Click Apply to add them to the quotation.` });
      setStage(4);
      // store suggested in state so Apply can use it
      setTimeout(()=> setSuggested(suggested), 10);
    } else if(stage===4){
      push({ from:'bot', text:'You can apply the suggestions or refine answers.' });
    }
  }

  const [suggested, setSuggested] = React.useState([]);

  function handleApply(){
    if(onApply && suggested && suggested.length) onApply(suggested);
    push({ from:'bot', text: 'Applied suggested charges to the quotation.' });
    setTimeout(()=> setOpen(false), 400);
  }

  return (
    <>
      <Box sx={{ position:'fixed', right:20, bottom:20, zIndex:1400 }}>
        <Fab color="primary" onClick={()=>setOpen(true)} aria-label="chat"><ChatBubbleOutlineIcon /></Fab>
      </Box>
      <Dialog open={open} onClose={()=>setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display:'flex', alignItems:'center', gap:1 }}>
          <Avatar sx={{ width:36, height:36, bgcolor:'#155fa0' }}>Q</Avatar>
          <Box sx={{ flex:1 }}>Start a chat</Box>
          <IconButton size="small" onClick={()=>setOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ height:420, display:'flex', flexDirection:'column', gap:1 }}>
          <Box sx={{ overflow:'auto', flex:1, p:1 }}>
            {messages.map((m,idx)=> (
              <Box key={idx} sx={{ mb:1, display:'flex', justifyContent: m.from==='bot'? 'flex-start':'flex-end' }}>
                <Box sx={{ bgcolor: m.from==='bot'? '#eaf2ff':'#e0e0e0', p:1.25, borderRadius:2, maxWidth:'80%' }}>
                  <Typography variant="body2">{m.text}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <Box sx={{ display:'flex', gap:1 }}>
            <TextField fullWidth size="small" placeholder="Start typing your message here..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=> e.key==='Enter' && handleSend()} />
            <Button variant="contained" onClick={handleSend}>Send</Button>
          </Box>
          {suggested.length>0 && (
            <Box sx={{ mt:1, display:'flex', gap:1, justifyContent:'flex-end' }}>
              <Button variant="outlined" onClick={()=>{ setSuggested([]); setStage(1); push({ from:'bot', text:'Okay, let\'s refine. What service are you looking for?' }); }}>Refine</Button>
              <Button variant="contained" onClick={handleApply}>Apply</Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
