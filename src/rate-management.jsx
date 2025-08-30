import { useMemo, useRef, useState } from "react";
import { Box, Card, CardContent, Button, TextField, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Grid, Table, TableBody, TableCell, TableHead, TableRow, Tooltip as MuiTooltip, Paper } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

// Plain JS version (types removed). Data shape docs:
// FCL rows: { lane, vendor?, container, transitDays?, transship?, costPerCntr, sellPerCntr, ros }
// LCL/Air rows: { lane, vendor?, transitDays?, transship?, ratePerKgCost, ratePerKgSell, minChargeCost?, minChargeSell?, ros }
// Transport/Customs rows: { lane, vendor?, transitDays?, transship?, cost, sell, ros }

export default function RateManagement() {
  const [modeTab, setModeTab] = useState("FCL");

  // FCL sample data
  const [fclRows, setFclRows] = useState([
    { lane: "THBKK → USLAX", vendor: "Evergreen", container: "40HC", transitDays: 22, transship: "SGSIN", costPerCntr: 1200, sellPerCntr: 1500, ros: 20 },
    { lane: "SGSIN → DEHAM", vendor: "Hapag-Lloyd", container: "20GP", transitDays: 28, transship: "AEJEA", costPerCntr: 900, sellPerCntr: 1150, ros: 22 },
  ]);

  // LCL sample data
  const [lclRows, setLclRows] = useState([
    { lane: "THBKK → HKHKG", vendor: "ConsolCo", ratePerKgCost: 0.15, ratePerKgSell: 0.2, minChargeCost: 30, minChargeSell: 40, ros: 25 },
  ]);

  // Air sample data
  const [airRows, setAirRows] = useState([
    { lane: "CNSHA → GBFXT", vendor: "CI", ratePerKgCost: 2.8, ratePerKgSell: 3.6, minChargeCost: 60, minChargeSell: 75, ros: 22 },
  ]);

  // Transport sample data
  const [transportRows, setTransportRows] = useState([
    { lane: "BKK City → Laem Chabang", vendor: "WICE Truck", cost: 120, sell: 160, ros: 25 },
  ]);

  // Customs sample data
  const [customsRows, setCustomsRows] = useState([
    { lane: "BKK Import Clearance", vendor: "WICE Customs", cost: 50, sell: 80, ros: 38 },
  ]);

  const [query, setQuery] = useState("");
  const fileInputRef = useRef(null);

  // Add dialog state (fields adapt by mode)
  const [open, setOpen] = useState(false);
  const [innerTab, setInnerTab] = useState('table');
  const [lane, setLane] = useState("");
  const [vendor, setVendor] = useState("");
  const [transitDays, setTransitDays] = useState("");
  const [transship, setTransship] = useState("");
  // FCL
  const [container, setContainer] = useState("40HC");
  const [costPerCntr, setCostPerCntr] = useState("");
  const [sellPerCntr, setSellPerCntr] = useState("");
  // Weight (LCL/Air)
  const [ratePerKgCost, setRatePerKgCost] = useState("");
  const [ratePerKgSell, setRatePerKgSell] = useState("");
  const [minChargeCost, setMinChargeCost] = useState("");
  const [minChargeSell, setMinChargeSell] = useState("");
  // Simple (Transport/Customs)
  const [cost, setCost] = useState("");
  const [sell, setSell] = useState("");

  const [importInfo, setImportInfo] = useState(null);
  const [error, setError] = useState(null);

  // utilities
  function rosFrom(cost, sell) {
    if (!sell) return 0;
    return Math.round(((sell - cost) / sell) * 100);
  }

  // filtering per tab
  const filteredFCL = useMemo(() => fclRows.filter(r => (r.lane + (r.vendor||"") + r.container).toLowerCase().includes(query.toLowerCase())), [fclRows, query]);
  const filteredLCL = useMemo(() => lclRows.filter(r => (r.lane + (r.vendor||"")).toLowerCase().includes(query.toLowerCase())), [lclRows, query]);
  const filteredAir = useMemo(() => airRows.filter(r => (r.lane + (r.vendor||"")).toLowerCase().includes(query.toLowerCase())), [airRows, query]);
  const filteredTransport = useMemo(() => transportRows.filter(r => (r.lane + (r.vendor||"")).toLowerCase().includes(query.toLowerCase())), [transportRows, query]);
  const filteredCustoms = useMemo(() => customsRows.filter(r => (r.lane + (r.vendor||"")).toLowerCase().includes(query.toLowerCase())), [customsRows, query]);

  // CSV Template per mode
  function downloadTemplate() {
    let csv = "";
    if (modeTab === "FCL") {
      csv = [
        "lane,vendor,container,transitDays,transship,costPerCntr,sellPerCntr",
        "THBKK → USLAX,Evergreen,40HC,22,SGSIN,1200,1500",
      ].join("\n");
    } else if (modeTab === "LCL" || modeTab === "Air") {
      csv = [
        "lane,vendor,transitDays,transship,ratePerKgCost,ratePerKgSell,minChargeCost,minChargeSell",
        "THBKK → HKHKG,ConsolCo,6,SGSIN,0.15,0.20,30,40",
      ].join("\n");
    } else {
      csv = [
        "lane,vendor,transitDays,transship,cost,sell",
        "BKK City → Laem Chabang,WICE Truck,1,-,120,160",
      ].join("\n");
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `rate_${modeTab.toLowerCase()}_template.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function onClickUpload() { fileInputRef.current?.click(); }

  async function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean); if (lines.length <= 1) { setImportInfo("No data rows found."); return; }
  const parts = (s) => s.split(",").map(x => x.trim());

    try {
      if (modeTab === "FCL") {
        const header = lines[0].toLowerCase();
        if (!(header.includes("lane") && header.includes("container") && header.includes("costpercntr") && header.includes("sellpercntr"))) throw new Error("Missing required FCL columns");
  const newRows = [];
        for (let i = 1; i < lines.length; i++) {
          const [lane, vendor, container, td, ts, cost, sell] = parts(lines[i]);
          if (!lane) continue;
          const c = Number(cost), s = Number(sell);
          newRows.push({ lane, vendor, container, transitDays: td?Number(td):undefined, transship: ts||undefined, costPerCntr: c, sellPerCntr: s, ros: rosFrom(c, s) });
        }
        setFclRows(prev => mergeByKey(prev, newRows, r => `${r.lane}__${r.vendor}__${r.container}`));
        setImportInfo(`Imported ${newRows.length} FCL rows.`);
      } else if (modeTab === "LCL" || modeTab === "Air") {
        const header = lines[0].toLowerCase();
        if (!(header.includes("lane") && header.includes("rateperkgcost") && header.includes("rateperkgsell"))) throw new Error("Missing required LCL/Air columns");
  const newRows = [];
        for (let i = 1; i < lines.length; i++) {
          const [lane, vendor, td, ts, rpc, rps, mcc, mcs] = parts(lines[i]);
          if (!lane) continue;
          const c = Number(rpc), s = Number(rps);
          newRows.push({ lane, vendor, transitDays: td?Number(td):undefined, transship: ts||undefined, ratePerKgCost: c, ratePerKgSell: s, minChargeCost: mcc?Number(mcc):undefined, minChargeSell: mcs?Number(mcs):undefined, ros: rosFrom(c, s) });
        }
        if (modeTab === "LCL") setLclRows(prev => mergeByKey(prev, newRows, r => `${r.lane}__${r.vendor}`));
        else setAirRows(prev => mergeByKey(prev, newRows, r => `${r.lane}__${r.vendor}`));
        setImportInfo(`Imported ${newRows.length} ${modeTab} rows.`);
      } else {
        const header = lines[0].toLowerCase();
        if (!(header.includes("lane") && header.includes("cost") && header.includes("sell"))) throw new Error("Missing required columns");
  const newRows = [];
        for (let i = 1; i < lines.length; i++) {
          const [lane, vendor, td, ts, cost, sell] = parts(lines[i]);
          if (!lane) continue; const c = Number(cost), s = Number(sell);
          newRows.push({ lane, vendor, transitDays: td?Number(td):undefined, transship: ts||undefined, cost: c, sell: s, ros: rosFrom(c, s) });
        }
        if (modeTab === "Transport") setTransportRows(prev => mergeByKey(prev, newRows, r => `${r.lane}__${r.vendor}`));
        else setCustomsRows(prev => mergeByKey(prev, newRows, r => `${r.lane}__${r.vendor}`));
        setImportInfo(`Imported ${newRows.length} ${modeTab} rows.`);
      }
    } catch (err) {
      setImportInfo(`Import error: ${err.message ?? err}`);
    }

    e.target.value = "";
  }

  function mergeByKey(prev, next, keyFn) {
    const map = new Map();
    [...prev, ...next].forEach(r => map.set(keyFn(r), r));
    return Array.from(map.values());
  }

  function resetForm() {
    setLane(""); setVendor(""); setTransitDays(""); setTransship("");
    setContainer("40HC"); setCostPerCntr(""); setSellPerCntr("");
    setRatePerKgCost(""); setRatePerKgSell(""); setMinChargeCost(""); setMinChargeSell("");
    setCost(""); setSell("");
  }

  function addRate() {
    setError(null);
    if (!lane.trim()) return setError("Lane is required");

    if (modeTab === "FCL") {
      const c = Number(costPerCntr), s = Number(sellPerCntr);
      if (Number.isNaN(c) || Number.isNaN(s)) return setError("Cost/Sell per container must be numbers");
  const row = { lane, vendor: vendor || "-", container, transitDays: transitDays?Number(transitDays):undefined, transship: transship || undefined, costPerCntr: c, sellPerCntr: s, ros: rosFrom(c, s) };
      setFclRows(prev => mergeByKey(prev, [row], r => `${r.lane}__${r.vendor}__${r.container}`));
    } else if (modeTab === "LCL" || modeTab === "Air") {
      const c = Number(ratePerKgCost), s = Number(ratePerKgSell);
      if (Number.isNaN(c) || Number.isNaN(s)) return setError("Rate per kg must be numbers");
  const row = { lane, vendor: vendor || "-", transitDays: transitDays?Number(transitDays):undefined, transship: transship || undefined, ratePerKgCost: c, ratePerKgSell: s, minChargeCost: minChargeCost?Number(minChargeCost):undefined, minChargeSell: minChargeSell?Number(minChargeSell):undefined, ros: rosFrom(c, s) };
      if (modeTab === "LCL") setLclRows(prev => mergeByKey(prev, [row], r => `${r.lane}__${r.vendor}`));
      else setAirRows(prev => mergeByKey(prev, [row], r => `${r.lane}__${r.vendor}`));
    } else {
      const c = Number(cost), s = Number(sell);
      if (Number.isNaN(c) || Number.isNaN(s)) return setError("Cost/Sell must be numbers");
  const row = { lane, vendor: vendor || "-", transitDays: transitDays?Number(transitDays):undefined, transship: transship || undefined, cost: c, sell: s, ros: rosFrom(c, s) };
      if (modeTab === "Transport") setTransportRows(prev => mergeByKey(prev, [row], r => `${r.lane}__${r.vendor}`));
      else setCustomsRows(prev => mergeByKey(prev, [row], r => `${r.lane}__${r.vendor}`));
    }

    resetForm();
    setOpen(false);
  }

  // --- Render helpers ---
  function renderToolbar() {
    return (
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex gap-2 md:w-1/2">
          <TextField size="small" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by lane or vendor..." label="Search" fullWidth />
        </div>
        <div className="flex gap-2">
          <Button variant="outlined" onClick={downloadTemplate}>Template</Button>
          <Button variant="outlined" onClick={() => fileInputRef.current?.click()}>Upload CSV</Button>
          <Button variant="contained" onClick={() => setOpen(true)}>Add Rate</Button>
          <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
            <DialogTitle>Add {modeTab} Rate</DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mt: 0 }}>
                <Grid item xs={12}>
                  <TextField label="Lane" value={lane} onChange={(e) => setLane(e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Vendor / Carrier" value={vendor} onChange={(e) => setVendor(e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField label="Transit Days" value={transitDays} onChange={(e) => setTransitDays(e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField label="Transship Port" value={transship} onChange={(e) => setTransship(e.target.value)} fullWidth size="small" />
                </Grid>

                {modeTab === 'FCL' && (
                  <>
                    <Grid item xs={12} md={3}><TextField label="Container" value={container} onChange={(e) => setContainer(e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={6} md={3}><TextField label="Cost / Cntr" value={costPerCntr} onChange={(e) => setCostPerCntr(e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={6} md={3}><TextField label="Sell / Cntr" value={sellPerCntr} onChange={(e) => setSellPerCntr(e.target.value)} fullWidth size="small" /></Grid>
                  </>
                )}

                {(modeTab === 'LCL' || modeTab === 'Air') && (
                  <>
                    <Grid item xs={6} md={3}><TextField label="Cost / Kg" value={ratePerKgCost} onChange={(e) => setRatePerKgCost(e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={6} md={3}><TextField label="Sell / Kg" value={ratePerKgSell} onChange={(e) => setRatePerKgSell(e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={6} md={3}><TextField label="Min Cost" value={minChargeCost} onChange={(e) => setMinChargeCost(e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={6} md={3}><TextField label="Min Sell" value={minChargeSell} onChange={(e) => setMinChargeSell(e.target.value)} fullWidth size="small" /></Grid>
                  </>
                )}

                {(modeTab === 'Transport' || modeTab === 'Customs') && (
                  <>
                    <Grid item xs={6} md={3}><TextField label="Cost" value={cost} onChange={(e) => setCost(e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={6} md={3}><TextField label="Sell" value={sell} onChange={(e) => setSell(e.target.value)} fullWidth size="small" /></Grid>
                  </>
                )}

                {error && <Grid item xs={12}><Typography color="error" variant="body2">{error}</Typography></Grid>}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
              <Button onClick={addRate} variant="contained">Save Rate</Button>
            </DialogActions>
          </Dialog>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>
      </div>
    );
  }

  function renderTable() {
    const headStyles = { fontWeight: 600 };
    const negative = (v) => v < 20;
    const commonHead = (cells) => (
      <TableHead>
        <TableRow>
          {cells.map((c,i)=><TableCell key={i} sx={headStyles}>{c}</TableCell>)}
        </TableRow>
      </TableHead>
    );
    const wrapper = (children) => <Table size="small">{children}</Table>;

    if (modeTab === 'FCL') {
      return wrapper(<>
        {commonHead(['Lane','Vendor','Container','Transit (d)','Transship','Cost / Cntr','Sell / Cntr','ROS %'])}
        <TableBody>
          {filteredFCL.map((r,i)=>(
            <TableRow key={i}>
              <TableCell>{r.lane}</TableCell>
              <TableCell>{r.vendor||'-'}</TableCell>
              <TableCell>{r.container}</TableCell>
              <TableCell>{r.transitDays ?? '-'}</TableCell>
              <TableCell>{r.transship ?? '-'}</TableCell>
              <TableCell>{r.costPerCntr.toLocaleString()}</TableCell>
              <TableCell>{r.sellPerCntr.toLocaleString()}</TableCell>
              <TableCell sx={negative(r.ros)?{color:'error.main', fontWeight:500}:undefined}>{r.ros}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </>);
    }
    if (modeTab === 'LCL' || modeTab === 'Air') {
      const rows = modeTab === 'LCL' ? filteredLCL : filteredAir;
      return wrapper(<>
        {commonHead(['Lane','Vendor','Transit (d)','Transship','Cost / Kg','Sell / Kg','Min Cost','Min Sell','ROS %'])}
        <TableBody>
          {rows.map((r,i)=>(
            <TableRow key={i}>
              <TableCell>{r.lane}</TableCell>
              <TableCell>{r.vendor||'-'}</TableCell>
              <TableCell>{r.transitDays ?? '-'}</TableCell>
              <TableCell>{r.transship ?? '-'}</TableCell>
              <TableCell>{r.ratePerKgCost.toLocaleString()}</TableCell>
              <TableCell>{r.ratePerKgSell.toLocaleString()}</TableCell>
              <TableCell>{r.minChargeCost?.toLocaleString() ?? '-'}</TableCell>
              <TableCell>{r.minChargeSell?.toLocaleString() ?? '-'}</TableCell>
              <TableCell sx={negative(r.ros)?{color:'error.main', fontWeight:500}:undefined}>{r.ros}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </>);
    }
    const rows = modeTab === 'Transport' ? filteredTransport : filteredCustoms;
    return wrapper(<>
      {commonHead(['Lane','Vendor','Transit (d)','Transship','Cost','Sell','ROS %'])}
      <TableBody>
        {rows.map((r,i)=>(
          <TableRow key={i}>
            <TableCell>{r.lane}</TableCell>
            <TableCell>{r.vendor||'-'}</TableCell>
            <TableCell>{r.transitDays ?? '-'}</TableCell>
            <TableCell>{r.transship ?? '-'}</TableCell>
            <TableCell>{r.cost.toLocaleString()}</TableCell>
            <TableCell>{r.sell.toLocaleString()}</TableCell>
            <TableCell sx={negative(r.ros)?{color:'error.main', fontWeight:500}:undefined}>{r.ros}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>);
  }

  function renderTrends() {
    // quick trend using numeric x-axis index since labels vary by mode
    const data = (modeTab === "FCL" ? fclRows.map((r, i) => ({ idx: i + 1, cost: r.costPerCntr, sell: r.sellPerCntr }))
      : modeTab === "LCL" ? lclRows.map((r, i) => ({ idx: i + 1, cost: r.ratePerKgCost, sell: r.ratePerKgSell }))
      : modeTab === "Air" ? airRows.map((r, i) => ({ idx: i + 1, cost: r.ratePerKgCost, sell: r.ratePerKgSell }))
      : modeTab === "Transport" ? transportRows.map((r, i) => ({ idx: i + 1, cost: r.cost, sell: r.sell }))
      : customsRows.map((r, i) => ({ idx: i + 1, cost: r.cost, sell: r.sell })));

    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <XAxis dataKey="idx" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="cost" />
          <Line type="monotone" dataKey="sell" />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <Box p={3} display="flex" flexDirection="column" gap={3}>
      <Typography variant="h5" fontWeight={600}>Rate Management Dashboard</Typography>
      <Tabs value={modeTab} onChange={(_,v)=> setModeTab(v)} aria-label="Mode tabs">
        <Tab value="FCL" label="Sea – FCL" />
        <Tab value="LCL" label="Sea – LCL" />
        <Tab value="Air" label="Air" />
        <Tab value="Transport" label="Transport" />
        <Tab value="Customs" label="Customs" />
      </Tabs>
      <Card variant="outlined">
        <CardContent>
          <Tabs value={innerTab} onChange={(_,v)=> setInnerTab(v)} aria-label="Inner view tabs" sx={{ mb:2 }}>
            <Tab value="table" label="Rate Table" />
            <Tab value="trends" label="Trends" />
            <Tab value="alerts" label="Alerts" />
          </Tabs>
          {innerTab === 'table' && <Box display="flex" flexDirection="column" gap={2}>{renderToolbar()}<Paper variant="outlined" sx={{ width:'100%', overflowX:'auto' }}>{renderTable()}</Paper></Box>}
          {innerTab === 'trends' && <Box>{renderTrends()}</Box>}
          {innerTab === 'alerts' && <Box>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>Alerts</Typography>
            <ul style={{ marginLeft: '1.25rem', fontSize: '0.85rem', lineHeight: 1.4 }}>
              <li>ROS below threshold on CNSHA → GBFXT (18%)</li>
              <li>Missing vendor rate on current tab ({modeTab})</li>
              <li>Expired contract rate on selected lane</li>
            </ul>
          </Box>}
        </CardContent>
      </Card>
      <input ref={fileInputRef} type="file" accept=".csv" style={{ display:'none' }} onChange={handleFile} />
    </Box>
  );
}
