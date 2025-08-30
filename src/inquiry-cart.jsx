import React, { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardHeader, CardContent, Typography, Grid, TextField, Button, Chip, Table, TableHead, TableBody, TableRow, TableCell, FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { useCart } from './cart-context';

/**
 * Inquiry Cart Mockup (React + shadcn/ui)
 * Cart icon top-right like shopping sites + click to open cart detail (Sheet).
 */

// Modes limited to primary Freightify categories we care about here
const MODES = ["Sea FCL", "Sea LCL", "Air"]; // others can be added later

// Sample Freightify response (trimmed). In production you'll fetch this from backend API proxy.
const FREIGHTIFY_SAMPLE = {
  reqId: 636287654356789,
  offers: [
    // Sea FCL example
    {
      freightifyId: "FCL_636203xxxxxxxxxxxxxxxxxx",
      match: "EXACT",
      productOffer: {
        carrierScac: "EKMS", // 4 letters => treat as Sea according to heuristic
        carrierName: "Emirates Marine",
        offerType: { source: "SPOT", referenceId: "1032037849" },
        originPort: "MAA",
        destinationPort: "HAM",
        origin: "IN-600031-chennai",
        destination: "DE-1945-Ruhland",
        vendorId: 3050,
        serviceType: "CY/CY",
      },
      productPrice: {
        validFrom: "16-Jun-2025",
        validTo: "16-Sep-2025",
        transitTimeInDays: 28,
        commodity: "FAK - Onion",
        viaPort: "INNSA",
        charges: [
          {
            amount: 1050,
            amountUsd: 15,
            description: "Basic Ocean Freight",
            rateCurrency: "EUR",
            qty: 2,
            rate: 525,
            rateBasis: "PER_CONTAINER",
          }
        ],
      }
    },
    // Sea LCL example (PER_KG, carrierScac length>2 & not necessarily 4 indicates sea)
    {
      freightifyId: "LCL_636203xxxxxxxxxxxxx001",
      match: "EXACT",
      productOffer: {
        carrierScac: "MAEU", // 4 letters => Sea LCL once basis is KG
        carrierName: "Maersk LCL",
        offerType: { source: "TARIFF", referenceId: "LCLREF123" },
        originPort: "THBKK",
        destinationPort: "SGSIN",
        origin: "TH-BANGKOK",
        destination: "SG-SINGAPORE",
        vendorId: 4021,
        serviceType: "CFS/CFS",
      },
      productPrice: {
        validFrom: "01-Aug-2025",
        validTo: "30-Sep-2025",
        transitTimeInDays: 7,
        commodity: "General Cargo",
        viaPort: "-",
        charges: [
          {
            description: "LCL Freight",
            rateBasis: "PER_KG",
            rateCurrency: "USD",
            qty: 1000, // kg example
            rate: 0.25,
            amount: 250,
          }
        ],
      }
    },
    // Air example (PER_KG with 2-letter carrier code => Air)
    {
      freightifyId: "AIR_636203xxxxxxxxxxxxx002",
      match: "EXACT",
      productOffer: {
        carrierScac: "TG", // 2 letters => Air
        carrierName: "Thai Airways",
        offerType: { source: "SPOT", referenceId: "AIRREF456" },
        originPort: "BKK",
        destinationPort: "HKG",
        origin: "TH-BANGKOK",
        destination: "HK-HONGKONG",
        vendorId: 5172,
        serviceType: "Airport/Airport",
      },
      productPrice: {
        validFrom: "15-Aug-2025",
        validTo: "15-Oct-2025",
        transitTimeInDays: 2,
        commodity: "Electronics",
        viaPort: "-",
        charges: [
          {
            description: "Air Freight",
            rateBasis: "PER_KG",
            rateCurrency: "USD",
            qty: 500, // chargeable weight kg
            rate: 3.1,
            amount: 1550,
          }
        ],
      }
    },
    // Extra Sea FCL 40HC
    {
      freightifyId: "FCL_636203xxxxxxxxxxxxx004",
      match: "EXACT",
      productOffer: {
        carrierScac: "ONE",
        carrierName: "Ocean Network Express",
        offerType: { source: "SPOT", referenceId: "FCLREF004" },
        originPort: "THBKK",
        destinationPort: "USLAX",
        origin: "TH-BANGKOK",
        destination: "US-LOSANGELES",
        vendorId: 6401,
        serviceType: "CY/CY",
      },
      productPrice: {
        validFrom: "20-Aug-2025",
        validTo: "20-Sep-2025",
        transitTimeInDays: 23,
        commodity: "FAK",
        viaPort: "-",
        charges: [
          { amount: 1800, amountUsd: 1800, description: "Basic Ocean Freight", rateCurrency: "USD", qty: 1, rate: 1800, rateBasis: "PER_CONTAINER", containerSizeType: "40HC" }
        ]
      }
    },
    // Extra Sea FCL 20GP
    {
      freightifyId: "FCL_636203xxxxxxxxxxxxx005",
      match: "EXACT",
      productOffer: {
        carrierScac: "MSCU",
        carrierName: "MSC",
        offerType: { source: "TARIFF", referenceId: "FCLREF005" },
        originPort: "CNSHA",
        destinationPort: "NLRTM",
        origin: "CN-SHANGHAI",
        destination: "NL-ROTTERDAM",
        vendorId: 7002,
        serviceType: "CY/CY",
      },
      productPrice: {
        validFrom: "10-Aug-2025",
        validTo: "10-Nov-2025",
        transitTimeInDays: 30,
        commodity: "FAK",
        viaPort: "-",
        charges: [
          { amount: 980, description: "Base Ocean Freight", rateCurrency: "USD", qty: 1, rate: 980, rateBasis: "PER_CONTAINER", containerSizeType: "20GP" }
        ]
      }
    },
    // Extra Sea LCL
    {
      freightifyId: "LCL_636203xxxxxxxxxxxxx006",
      match: "EXACT",
      productOffer: {
        carrierScac: "HLCU",
        carrierName: "Hapag LCL",
        offerType: { source: "SPOT", referenceId: "LCLREF006" },
        originPort: "VNSGN",
        destinationPort: "SGSIN",
        origin: "VN-HOCHIMINH",
        destination: "SG-SINGAPORE",
        vendorId: 8123,
        serviceType: "CFS/CFS",
      },
      productPrice: {
        validFrom: "05-Aug-2025",
        validTo: "05-Sep-2025",
        transitTimeInDays: 5,
        commodity: "General Cargo",
        viaPort: "-",
        charges: [
          { description: "LCL Freight", rateBasis: "PER_KG", rateCurrency: "USD", qty: 500, rate: 0.32, amount: 160 }
        ]
      }
    },
    // Extra Air
    {
      freightifyId: "AIR_636203xxxxxxxxxxxxx007",
      match: "EXACT",
      productOffer: {
        carrierScac: "SQ", // Singapore Airlines
        carrierName: "Singapore Airlines Cargo",
        offerType: { source: "SPOT", referenceId: "AIRREF007" },
        originPort: "SIN",
        destinationPort: "FRA",
        origin: "SG-SINGAPORE",
        destination: "DE-FRANKFURT",
        vendorId: 9331,
        serviceType: "Airport/Airport",
      },
      productPrice: {
        validFrom: "18-Aug-2025",
        validTo: "18-Sep-2025",
        transitTimeInDays: 3,
        commodity: "Pharma",
        viaPort: "-",
        charges: [
          { description: "Air Freight", rateBasis: "PER_KG", rateCurrency: "USD", qty: 300, rate: 4.2, amount: 1260 }
        ]
      }
    }
  ]
};

// Normalization: convert Freightify offer to internal rate row expected by table
function normalizeFreightify(resp){
  if(!resp?.offers) return [];
  const rows = [];
  for(const offer of resp.offers){
    const po = offer.productOffer || {}; const pp = offer.productPrice || {}; const charges = (pp.charges||[]);
    // We treat first freight charge as primary
    const main = charges[0] || {};
    const basis = main.rateBasis === 'PER_CONTAINER' ? 'Per Container' : main.rateBasis === 'PER_KG' ? 'Per KG' : main.rateBasis || 'N/A';
    // Mode heuristic
    let mode = 'Sea FCL';
    if(basis === 'Per KG') mode = po.carrierScac?.length===2 ? 'Air' : 'Sea LCL';
    if(basis === 'Per Container' && (main.description||'').toLowerCase().includes('lcl')) mode = 'Sea LCL';
    const containerType = basis === 'Per Container' ? (main.containerSizeType || '40HC') : '-';
    const sell = typeof main.amount === 'number' ? main.amount : (main.rate||0) * (main.qty||1);
    const margin = sell * 0.15; // placeholder until buy cost exposed
    const ros = sell ? (margin / sell) * 100 : 0;
    rows.push({
      id: offer.freightifyId,
      mode,
      carrier: po.carrierScac || '-',
      vendor: po.carrierName || po.vendorId || '-',
      containerType,
      basis,
      origin: po.originPort || po.origin || '-',
      destination: po.destinationPort || po.destination || '-',
      transitTime: pp.transitTimeInDays,
      validity: { from: pp.validFrom, to: pp.validTo },
      sell,
      margin,
      ros,
      trend: [sell*0.92, sell*0.95, sell*0.97, sell, sell*1.02, sell*0.99, sell],
      raw: offer,
    });
  }
  return rows;
}

function ROSBadge({ value }){ const color = value >= 20 ? 'success' : value >= 12 ? 'warning' : 'error'; return <Chip size="small" color={color} label={value.toFixed(1)+"%"} variant={value>=20?'filled':'outlined'} />; }

function TrendSpark({ data }){ const points = data.map((y,i)=>({ x:i, y })); return <Box sx={{ height:34, width:96 }}><ResponsiveContainer><LineChart data={points} margin={{ top:4, left:0, right:0, bottom:0 }}><Line type="monotone" dataKey="y" dot={false} strokeWidth={2} stroke="#1976d2" /></LineChart></ResponsiveContainer></Box>; }

function fmt(v) {
  if (typeof v !== "number") return v;
  const abs = Math.abs(v);
  return abs < 10 ? v.toFixed(2) : abs < 100 ? v.toFixed(1) : Math.round(v).toString();
}

export default function InquiryCart(){
  const [mode, setMode] = useState('Sea FCL');
  const [customer, setCustomer] = useState('');
  const [pairs, setPairs] = useState([{ origin:'', destination:'' }]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [sort, setSort] = useState({ key:'vendor', dir:'asc' });
  const [rawResponse, setRawResponse] = useState(FREIGHTIFY_SAMPLE); // future: fetched
  const [allRates, setAllRates] = useState([]);
  const { add } = useCart();

  // Normalize when rawResponse changes
  useEffect(()=>{ setAllRates(normalizeFreightify(rawResponse)); }, [rawResponse]);

  const currentPair = pairs[activeIdx] || { origin:'', destination:'' };
  const matches = useMemo(()=> allRates
    .filter(r=> r.mode === mode)
    .filter(r=> !currentPair.origin || r.origin.toLowerCase().includes(currentPair.origin.toLowerCase()))
    .filter(r=> !currentPair.destination || r.destination.toLowerCase().includes(currentPair.destination.toLowerCase()))
    .sort((a,b)=>{ const ka=a[sort.key]; const kb=b[sort.key]; if(ka<kb) return sort.dir==='asc'?-1:1; if(ka>kb) return sort.dir==='asc'?1:-1; return 0; })
  ,[mode, currentPair, sort, allRates]);

  function addToCart(rate){ add(rate); }
  function addPair(){ setPairs(p=> [...p, { origin:'', destination:'' }]); }
  function updatePair(idx, patch){ setPairs(p=> p.map((row,i)=> i===idx? { ...row, ...patch }: row)); }
  function removePair(idx){ setPairs(p=> p.filter((_,i)=> i!==idx)); if(activeIdx>=idx && activeIdx>0) setActiveIdx(a=> a-1); }

  return (
    <Box display="flex" flexDirection="column" gap={3} p={1}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Inquiry Cart Builder</Typography>
        <Tooltip title="Use top-right global cart icon"><span><IconButton color="primary" disabled><ShoppingCartIcon /></IconButton></span></Tooltip>
      </Box>

      <Card variant="outlined">
        <CardHeader title={<Typography variant="subtitle1">Select Mode, Customer & Multiple OD Pairs</Typography>} />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>Mode</InputLabel>
                <Select label="Mode" value={mode} onChange={e=>setMode(e.target.value)}>{MODES.map(m=> <MenuItem key={m} value={m}>{m}</MenuItem>)}</Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}><TextField size="small" label="Customer" value={customer} onChange={e=>setCustomer(e.target.value)} fullWidth/></Grid>
            {pairs.map((p,idx)=>(
              <Grid key={idx} item xs={12} md={6}>
                <Box display="flex" gap={1} alignItems="flex-end">
                  <TextField size="small" label={`Origin ${idx+1}`} value={p.origin} onChange={e=>updatePair(idx,{ origin:e.target.value })} sx={{ flex:1 }}/>
                  <TextField size="small" label={`Destination ${idx+1}`} value={p.destination} onChange={e=>updatePair(idx,{ destination:e.target.value })} sx={{ flex:1 }}/>
                  {pairs.length>1 && <IconButton size="small" onClick={()=>removePair(idx)}>✕</IconButton>}
                </Box>
              </Grid>
            ))}
            <Grid item xs={12}><Button size="small" variant="outlined" onClick={addPair}>Add OD Pair</Button></Grid>
          </Grid>
          <Box mt={2} display="flex" gap={1} flexWrap="wrap">
            {pairs.map((p,idx)=>(
              <Button key={idx} size="small" variant={idx===activeIdx? 'contained':'outlined'} onClick={()=>setActiveIdx(idx)}>{p.origin||'---'} → {p.destination||'---'}</Button>
            ))}
          </Box>
          <Typography mt={1} variant="caption" color="text.secondary">Select a pair to filter matched rates. Add rates; they appear in global cart (icon top-right).</Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader title={<Typography variant="subtitle1">Matched Rates (Pair {activeIdx+1})</Typography>} />
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>
                  <Button size="small" onClick={()=>setSort(s=> ({ key:'vendor', dir:s.key==='vendor' && s.dir==='asc'?'desc':'asc' }))} endIcon={sort.key==='vendor'? (sort.dir==='asc'? <ArrowUpwardIcon fontSize="inherit"/>:<ArrowDownwardIcon fontSize="inherit"/>) : null}>Vendor / Carrier</Button>
                </TableCell>
                <TableCell>OD</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell align="right">Sell</TableCell>
                <TableCell align="right">Margin</TableCell>
                <TableCell align="center">ROS</TableCell>
                <TableCell>Validity</TableCell>
                <TableCell align="center">T/T</TableCell>
                <TableCell>Trend</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matches.map(r=> (
                <TableRow key={r.id} hover>
                  <TableCell><Button size="small" variant="outlined" startIcon={<ShoppingCartIcon fontSize="inherit"/>} onClick={()=>addToCart(r)}>Add</Button></TableCell>
                  <TableCell>
                    <Box display="flex" flexDirection="column">
                      <Typography variant="body2" fontWeight={500}>{r.vendor}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.carrier}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{r.origin} → {r.destination}</TableCell>
                  <TableCell>
                    <Typography variant="caption" fontWeight={500} display="block">{r.containerType}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.basis}</Typography>
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight:600 }}>{fmt(r.sell)}</TableCell>
                  <TableCell align="right">{fmt(r.margin)}</TableCell>
                  <TableCell align="center"><ROSBadge value={r.ros} /></TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{r.validity.from} → {r.validity.to}</Typography></TableCell>
                  <TableCell align="center">{r.transitTime}d</TableCell>
                  <TableCell><TrendSpark data={r.trend} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {matches.length===0 && <Typography mt={2} variant="caption" color="text.secondary">No offers for filters – try another mode or OD.</Typography>}
        </CardContent>
      </Card>

  {/* Cart drawer moved to global shell */}
    </Box>
  );
}
