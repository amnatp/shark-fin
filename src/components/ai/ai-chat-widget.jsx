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
      // When opened, immediately show a friendly header and dummy conversion suggestions
      const intro = { from:'bot', text:'Let us help! Based on common enquiries, here are some suggested charges you can apply.' };
      setMessages([intro]);
      const convo = 'Auto-suggest';
      const suggestedNow = [
        { id:`C-${Date.now()}-A`, name:'BAF (Fuel Surcharge)', basis:'Per Container', qty:1, sell:150, margin:0, notes:`Suggested — ${convo}` },
        { id:`C-${Date.now()}-B`, name:'Peak Season Surcharge (PSS)', basis:'Per Container', qty:1, sell:100, margin:0, notes:`Suggested — ${convo}` },
        { id:`C-${Date.now()}-C`, name:'Documentation Fee', basis:'Per B/L', qty:1, sell:40, margin:0, notes:`Suggested — ${convo}` }
      ];
      setSuggested(suggestedNow);
      setStage(4);
    }else{
      setMessages([]); setStage(0); setInput(''); setSuggested([]);
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

  // Demo conversion: emit a structured payload simulating the user's example conversation
  function runDemoConversion(){
    // push a scripted conversation progressively
    const steps = [
      { from:'user', text: 'Start a new quotation for ACME Electronics. Route Bangkok to Los Angeles, 1×40HC, Door→Door.' },
      { from:'bot', text: 'Noted. Mode Sea FCL, Scope Door→Door. Do you want me to pick the nearest POL/POD as THBKK → USLAX?' },
      { from:'user', text: 'Yes. Use DAP at destination.' },
      { from:'bot', text: 'DAP (buyer clears import). Pulling rates… I found 3 carrier options valid to Dec-31. Fastest is 22 days (Carrier ONE).' },
      { from:'user', text: 'Add ONE, 40HC.' },
      { from:'bot', text: 'Added line (rateId RID-9Q2KX). Apply your “Std Export TH” template (THC, DO, ISF, AMS)?' },
      { from:'user', text: 'Yes.' },
      { from:'bot', text: 'Template applied (4 charges). Preliminary totals: Sell 2,225.' }
    ];

    // show each step with delay, then emit structured payload
    let i = 0;
    const t = setInterval(()=>{
      const s = steps[i++]; if(!s){ clearInterval(t);
        // Emit structured payload: one new line and template charges
        const newLine = { rateId: 'RID-9Q2KX', vendor: 'ONE', carrier: 'ONE', origin: 'THBKK', destination: 'USLAX', unit: '40HC', qty:1, sell:2000, margin:200 };
        const templateCharges = [
          { id:`C-${Date.now()}-T1`, name:'THC', basis:'Per Container', qty:1, sell:100, margin:0, notes:'From Std Export TH' },
          { id:`C-${Date.now()}-T2`, name:'DO', basis:'Per B/L', qty:1, sell:40, margin:0, notes:'From Std Export TH' },
          { id:`C-${Date.now()}-T3`, name:'ISF', basis:'Per Shipment', qty:1, sell:50, margin:0, notes:'From Std Export TH' },
          { id:`C-${Date.now()}-T4`, name:'AMS', basis:'Per Filing', qty:1, sell:35, margin:0, notes:'From Std Export TH' }
        ];
        const payload = { lines:[newLine], charges: templateCharges, templateName: 'Std Export TH', totals:{ sell:2225 } };
        if(onApply) onApply(payload);
        return;
      }
      push(s);
    }, 600);
  }

  function runAirDemo(){
    setMessages([]); setSuggested([]);
    const convo = [
      { from:'user', text: 'Quote from BKK (door) to FRA (airport), 120 kg electronics.' },
      { from:'bot', text: 'Got it. I’ll price Door→Airport. For air, we apply the best weight break ≥100kg and a minimum if needed. Commodity = electronics, correct?' },
      { from:'user', text: 'Yes.' },
      { from:'bot', text: 'Best option: TG via BKK→FRA, transit 13–15h. Break +100kg @ 4.50/kg, MIN 50. Your 120 kg → 540 USD. Pickup (Bangkok metro) adds 35 USD. Total 575 USD all-in to FRA airport.' },
      { from:'user', text: 'Any cheaper?' },
      { from:'bot', text: 'LH consol is 4.20/kg (120×4.20 = 504 USD) but transit 18–24h. Pickup same 35 → 539 USD total.' },
      { from:'user', text: 'Take the LH option.' },
      { from:'bot', text: 'Added to cart. I can generate a formal quotation (reference Q-000233) and hold this price for 7 days. Proceed?' }
    ];
    let i=0;
    const t = setInterval(()=>{
      const s = convo[i++];
      if(!s){ clearInterval(t); return; }
      push(s);
      if(i===convo.length){
        // after showing conversation, present action buttons by setting suggested to hold two options summary
        const tg = { id:`L-${Date.now()}-TG`, rateId:'RID-TG-22', vendor:'Thai Airways', carrier:'TG', origin:'BKK', destination:'FRA', unit:'KG', qty:120, sell:575, margin:0, notes:'TG best (13–15h) pickup 35 included' };
        const lh = { id:`L-${Date.now()}-LH`, rateId:'RID-LH-18', vendor:'Lufthansa', carrier:'LH', origin:'BKK', destination:'FRA', unit:'KG', qty:120, sell:539, margin:0, notes:'LH consol slower (18–24h) pickup 35 included' };
        setSuggested([tg, lh]);
      }
    }, 700);
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
          <Box sx={{ display:'flex', gap:1, mt:1 }}>
            <Button variant="outlined" onClick={runDemoConversion}>Demo conversion</Button>
            <Button variant="outlined" onClick={runAirDemo}>Air demo</Button>
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
