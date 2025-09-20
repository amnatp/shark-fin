import { useEffect, useMemo, useState } from 'react';
import { Box, Grid, Paper, Typography, Divider, Chip, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

// Lightweight mock metrics layer drawing from localStorage (prototype only)
function load(name, fallback){ try { return JSON.parse(localStorage.getItem(name)||fallback); } catch { return JSON.parse(fallback); } }

function useData(){
  const [tick, setTick] = useState(0);
  useEffect(()=>{
    const refresher = ()=> setTick(t=>t+1);
    window.addEventListener('storage', refresher);
    window.addEventListener('managedRatesUpdated', refresher);
    return ()=> { window.removeEventListener('storage', refresher); window.removeEventListener('managedRatesUpdated', refresher); };
  },[]);
  return useMemo(()=>{
  // Prefer canonical savedInquiries key; fallback to deprecated 'inquiries'
  let inquiries = load('savedInquiries','[]');
  if(!Array.isArray(inquiries) || !inquiries.length){ inquiries = load('inquiries','[]'); }
    const quotations = load('quotations','[]');
    const requests = load('pricingRequests','[]');
    const managed = load('managedRates','{}');
    return { inquiries, quotations, requests, managed, tick };
  },[tick]);
}

function computeMetrics({ inquiries, quotations, requests, managed }){
  const now = Date.now();
  // SLA metrics for pricing requests
  const slaWindowDays = 3;
  let met=0, missed=0;
  const slaSeries = requests.map(r=>{
    const created = r.createdAt ? new Date(r.createdAt).getTime() : now;
    const replied = r.status==='REPLIED' && r.repliedAt ? new Date(r.repliedAt).getTime() : null;
    const ageDays = ((replied||now) - created)/(1000*3600*24);
    const closed = !!replied;
    const slaMet = closed ? ageDays <= slaWindowDays : ageDays <= slaWindowDays; // open but not overdue yet counts tentative
    if(closed){ slaMet ? met++ : missed++; }
    else if(ageDays>slaWindowDays) missed++; else met++; // treat active within window as met for gauge-like display
    return { id:r.id, status:r.status, age: +ageDays.toFixed(2), slaMet };
  });
  // Quotation performance: win rate mock (status approve treated as won vs draft)
  const monthKey = d=>{ const dt = d.createdAt? new Date(d.createdAt): new Date(); return dt.getFullYear()+"-"+(dt.getMonth()+1).toString().padStart(2,'0'); };
  const byMonth = {};
  quotations.forEach(q=>{
    const k = monthKey(q);
    byMonth[k] = byMonth[k] || { month:k, total:0, won:0, ros:[] };
    byMonth[k].total++;
    if(q.status==='approve' || q.status==='Won') byMonth[k].won++;
    if(q.totals && q.totals.ros!=null) byMonth[k].ros.push(q.totals.ros*100);
  });
  const quotationTrend = Object.values(byMonth).sort((a,b)=> a.month.localeCompare(b.month)).map(m=>({
    month:m.month,
    winRate: m.total? +(m.won/m.total*100).toFixed(1):0,
    avgROS: m.ros.length? +(m.ros.reduce((s,v)=>s+v,0)/m.ros.length).toFixed(1):0
  }));
  // Rate performance: utilization (bookings vs total) using bookingCount on managed rates
  const rateUtil = [];
  Object.keys(managed||{}).forEach(mode=>{
    const list = Array.isArray(managed[mode]) ? managed[mode] : [];
    list.slice(0,12).forEach(r=>{
      rateUtil.push({ mode, lane:`${r.origin||'-'}-${r.destination||'-'}`, bookingCount:r.bookingCount||0, ros:r.ros||((r.margin && r.sell)? (r.margin/r.sell*100): null) });
    });
  });
  const topUtil = rateUtil.sort((a,b)=> b.bookingCount - a.bookingCount).slice(0,8);
  // ROS distribution pie (simple buckets)
  const rosBuckets = { '<12':0,'12-15':0,'15-20':0,'>20':0 };
  quotations.forEach(q=>{ const v = q.totals && q.totals.ros!=null? q.totals.ros*100 : null; if(v==null) return; if(v<12) rosBuckets['<12']++; else if(v<15) rosBuckets['12-15']++; else if(v<20) rosBuckets['15-20']++; else rosBuckets['>20']++; });
  const rosPie = Object.entries(rosBuckets).map(([k,v])=>({ name:k, value:v }));
  // Simple pipeline placeholder (count only) to surface inquiries usage & avoid unused lint
  const pipeline = { totalInquiries: inquiries.length };
  // Quotation turnaround time (inquiry creation -> quotation submission) in hours
  const inqMap = {}; (inquiries||[]).forEach(i=> { if(i && i.id) inqMap[i.id]=i; });
  const turnaroundSeries = []; let sumH=0; let nH=0;
  quotations.forEach(q=> {
    if(q.submittedAt && q.inquiryId){
      const inq = inqMap[q.inquiryId];
      if(inq && inq.createdAt){
        const h = (new Date(q.submittedAt).getTime() - new Date(inq.createdAt).getTime())/(1000*60*60);
        if(h>=0){ const hours = +h.toFixed(2); turnaroundSeries.push({ id:q.id, hours }); sumH+=hours; nH++; }
      }
    }
  });
  const avgHours = nH? +(sumH/nH).toFixed(2): null;
  const bucketDefs = { '0-12':0,'12-24':0,'24-48':0,'>48':0 };
  turnaroundSeries.forEach(t=> { if(t.hours<12) bucketDefs['0-12']++; else if(t.hours<24) bucketDefs['12-24']++; else if(t.hours<48) bucketDefs['24-48']++; else bucketDefs['>48']++; });
  const turnaroundBuckets = Object.entries(bucketDefs).map(([name,value])=> ({ name, value }));
  const quotationTurnaround = { series:turnaroundSeries, avgHours, buckets:turnaroundBuckets };
  return { slaSeries, sla:{ met, missed }, quotationTrend, topUtil, rosPie, pipeline, quotationTurnaround };
}

const COLORS = ['#1e88e5','#1565c0','#43a047','#ef6c00','#8e24aa','#c62828'];

export default function Dashboards(){
  const data = useData();
  const metrics = useMemo(()=> computeMetrics(data), [data]);
  const [view,setView] = useState('pricing');
  return (
    <Box p={2} display="flex" flexDirection="column" gap={3}>
      <Box display="flex" alignItems="center" gap={2}>
        <Typography variant="h5" fontWeight={600}>Analytics Dashboards (Mock)</Typography>
        <ToggleButtonGroup value={view} exclusive size="small" onChange={(e,v)=> v && setView(v)}>
          <ToggleButton value="pricing">Pricing</ToggleButton>
          <ToggleButton value="sales">Sales</ToggleButton>
        </ToggleButtonGroup>
        <Chip label="Prototype" color="primary" size="small" />
      </Box>
      {view==='pricing' && <PricingDashboard metrics={metrics} />}
      {view==='sales' && <SalesDashboard metrics={metrics} />}
    </Box>
  );
}

function Card({ title, actions, children, minHeight=260 }){
  return (
    <Paper sx={{ p:2, display:'flex', flexDirection:'column', gap:1, minHeight }} elevation={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2" fontWeight={600}>{title}</Typography>
        {actions}
      </Box>
      <Divider />
      <Box flexGrow={1} minHeight={140}>{children}</Box>
    </Paper>
  );
}

function PricingDashboard({ metrics }){
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card title="Pricing SLA Compliance (≤3d)">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={[{name:'Met/Within', value:metrics.sla.met},{name:'Missed/Overdue', value:metrics.sla.missed}]} dataKey="value" innerRadius={50} outerRadius={80} label>
                <Cell fill="#43a047" />
                <Cell fill="#c62828" />
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <Typography variant="caption">Open requests inside window counted as Met (tentative) until closure.</Typography>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card title="RFQ Turnaround (Age Days)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics.slaSeries.slice(0,20)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="id" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="age" fill="#1565c0" />
            </BarChart>
          </ResponsiveContainer>
          <Typography variant="caption">Each bar = pricing request age (days).</Typography>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card title="Top Lane Utilization (Bookings)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics.topUtil}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="lane" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="bookingCount" fill="#8e24aa" />
            </BarChart>
          </ResponsiveContainer>
          <Typography variant="caption">Based on rate bookingCount field (prototype).</Typography>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card title="Quotation Win Rate & Avg ROS (Monthly)">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={metrics.quotationTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" orientation="left" tickFormatter={v=>v+'%'} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v=>v+'%'} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="winRate" name="Win %" stroke="#1e88e5" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="avgROS" name="Avg ROS %" stroke="#43a047" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card title="Quotation ROS Distribution">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={metrics.rosPie} dataKey="value" outerRadius={90} label>
                {metrics.rosPie.map((e,i)=>(<Cell key={e.name} fill={COLORS[i%COLORS.length]} />))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <Typography variant="caption">Bucketed by overall quotation ROS.</Typography>
        </Card>
      </Grid>
    </Grid>
  );
}

function SalesDashboard({ metrics }){
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Card title="Win Rate & Avg ROS (Monthly)">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={metrics.quotationTrend}>
              <defs>
                <linearGradient id="colorWin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e88e5" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="#1e88e5" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={v=>v+'%'} />
              <Tooltip />
              <Area type="monotone" dataKey="winRate" stroke="#1e88e5" fillOpacity={1} fill="url(#colorWin)" />
              <Line type="monotone" dataKey="avgROS" stroke="#43a047" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card title="Top Lane Utilization (Bookings)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={metrics.topUtil}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="lane" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="bookingCount" fill="#8e24aa" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card title="Quotation Turnaround (Hours)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={metrics.quotationTurnaround.series.slice(0,25)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="id" hide />
              <YAxis tickFormatter={v=>v+'h'} />
              <Tooltip formatter={(v)=> v+' h'} />
              <Bar dataKey="hours" fill="#1565c0" />
            </BarChart>
          </ResponsiveContainer>
          <Typography variant="caption">Avg: {metrics.quotationTurnaround.avgHours!=null? metrics.quotationTurnaround.avgHours+'h':'—'} • Buckets: {metrics.quotationTurnaround.buckets.map(b=> `${b.name}:${b.value}`).join(' ')} </Typography>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card title="Quotation ROS Distribution">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={metrics.rosPie} dataKey="value" outerRadius={90} label>
                {metrics.rosPie.map((e,i)=>(<Cell key={e.name} fill={COLORS[i%COLORS.length]} />))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card title="Pricing SLA Snapshot (Shared View)">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={[{name:'Met/Within', value:metrics.sla.met},{name:'Missed/Overdue', value:metrics.sla.missed}]} dataKey="value" outerRadius={80} label>
                <Cell fill="#43a047" />
                <Cell fill="#c62828" />
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <Typography variant="caption">Sales visibility of Pricing responsiveness.</Typography>
        </Card>
      </Grid>
    </Grid>
  );
}
