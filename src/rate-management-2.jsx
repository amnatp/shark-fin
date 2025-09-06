import React, { useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider
} from "@mui/material";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

// helper
const rosFrom = (cost, sell) => (sell ? Math.round(((sell - cost) / sell) * 100) : 0);
const mergeByKey = (prev, next, keyFn) => {
  const map = new Map();
  [...prev, ...next].forEach((r) => map.set(keyFn(r), r));
  return Array.from(map.values());
};

export default function RateManagementMockup() {
  const [modeTab, setModeTab] = useState("FCL");
  const [innerTab, setInnerTab] = useState("table");
  const [query, setQuery] = useState("");

  // --- Data ---
  const [fclRows, setFclRows] = useState([
    { lane: "THBKK → USLAX", vendor: "Evergreen", container: "40HC", transitDays: 22, transship: "SGSIN", costPerCntr: 1200, sellPerCntr: 1500, ros: 20 },
    { lane: "SGSIN → DEHAM", vendor: "Hapag-Lloyd", container: "20GP", transitDays: 28, transship: "AEJEA", costPerCntr: 900, sellPerCntr: 1150, ros: 22 },
  ]);
  const [lclRows, setLclRows] = useState([
    { lane: "THBKK → HKHKG", vendor: "ConsolCo", ratePerKgCost: 0.15, ratePerKgSell: 0.2, minChargeCost: 30, minChargeSell: 40, ros: 25 },
  ]);
  const [airRows, setAirRows] = useState([
    { lane: "CNSHA → GBFXT", vendor: "CI", ratePerKgCost: 2.8, ratePerKgSell: 3.6, minChargeCost: 60, minChargeSell: 75, ros: 22 },
  ]);
  const [transportRows, setTransportRows] = useState([
    { lane: "BKK City → Laem Chabang", vendor: "WICE Truck", cost: 120, sell: 160, ros: 25 },
  ]);
  const [customsRows, setCustomsRows] = useState([
    { lane: "BKK Import Clearance", vendor: "WICE Customs", cost: 50, sell: 80, ros: 38 },
  ]);

  // --- Filtering ---
  const filteredFCL = useMemo(() => fclRows.filter(r => (r.lane + (r.vendor||"") + r.container).toLowerCase().includes(query.toLowerCase())), [fclRows, query]);
  const filteredLCL = useMemo(() => lclRows.filter(r => (r.lane + (r.vendor||"")).toLowerCase().includes(query.toLowerCase())), [lclRows, query]);
  const filteredAir = useMemo(() => airRows.filter(r => (r.lane + (r.vendor||"")).toLowerCase().includes(query.toLowerCase())), [airRows, query]);
  const filteredTransport = useMemo(() => transportRows.filter(r => (r.lane + (r.vendor||"")).toLowerCase().includes(query.toLowerCase())), [transportRows, query]);
  const filteredCustoms = useMemo(() => customsRows.filter(r => (r.lane + (r.vendor||"")).toLowerCase().includes(query.toLowerCase())), [customsRows, query]);

  // --- Upload CSV ---
  const fileInputRef = useRef(null);
  const [importInfo, setImportInfo] = useState(null);
  const onClickUpload = () => fileInputRef.current?.click();
  const downloadTemplate = () => {
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
  };
  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean); if (lines.length <= 1) { setImportInfo("No data rows found."); return; }
    const parts = (s) => s.split(",").map(x => x.trim());

    try {
      if (modeTab === "FCL") {
        const header = lines[0].toLowerCase();
        if (!(header.includes("lane") && header.includes("container") && header.includes("costpercntr") && header.includes("sellpercntr"))) throw new Error("Missing FCL columns");
        const next = [];
        for (let i = 1; i < lines.length; i++) {
          const [lane, vendor, container, td, ts, cost, sell] = parts(lines[i]);
          if (!lane) continue;
          const c = Number(cost), s = Number(sell);
          next.push({ lane, vendor, container, transitDays: td?Number(td):undefined, transship: ts||undefined, costPerCntr: c, sellPerCntr: s, ros: rosFrom(c, s) });
        }
        setFclRows(prev => mergeByKey(prev, next, r => `${r.lane}__${r.vendor}__${r.container}`));
        setImportInfo(`Imported ${next.length} FCL rows.`);
      } else if (modeTab === "LCL" || modeTab === "Air") {
        const header = lines[0].toLowerCase();
        if (!(header.includes("lane") && header.includes("rateperkgcost") && header.includes("rateperkgsell"))) throw new Error("Missing LCL/Air columns");
        const next = [];
        for (let i = 1; i < lines.length; i++) {
          const [lane, vendor, td, ts, rpc, rps, mcc, mcs] = parts(lines[i]);
          if (!lane) continue; const c = Number(rpc), s = Number(rps);
          next.push({ lane, vendor, transitDays: td?Number(td):undefined, transship: ts||undefined, ratePerKgCost: c, ratePerKgSell: s, minChargeCost: mcc?Number(mcc):undefined, minChargeSell: mcs?Number(mcs):undefined, ros: rosFrom(c, s) });
        }
        if (modeTab === "LCL") setLclRows(prev => mergeByKey(prev, next, r => `${r.lane}__${r.vendor}`));
        else setAirRows(prev => mergeByKey(prev, next, r => `${r.lane}__${r.vendor}`));
        setImportInfo(`Imported ${next.length} ${modeTab} rows.`);
      } else {
        const header = lines[0].toLowerCase();
        if (!(header.includes("lane") && header.includes("cost") && header.includes("sell"))) throw new Error("Missing columns");
        const next = [];
        for (let i = 1; i < lines.length; i++) {
          const [lane, vendor, td, ts, cost, sell] = parts(lines[i]);
          if (!lane) continue; const c = Number(cost), s = Number(sell);
          next.push({ lane, vendor, transitDays: td?Number(td):undefined, transship: ts||undefined, cost: c, sell: s, ros: rosFrom(c, s) });
        }
        if (modeTab === "Transport") setTransportRows(prev => mergeByKey(prev, next, r => `${r.lane}__${r.vendor}`));
        else setCustomsRows(prev => mergeByKey(prev, next, r => `${r.lane}__${r.vendor}`));
        setImportInfo(`Imported ${next.length} ${modeTab} rows.`);
      }
    } catch (err) {
      setImportInfo(`Import error: ${err.message ?? err}`);
    }

    e.target.value = "";
  };

  // --- Add Rate Dialog ---
  const [open, setOpen] = useState(false);
  const [lane, setLane] = useState("");
  const [vendor, setVendor] = useState("");
  const [transitDays, setTransitDays] = useState("");
  const [transship, setTransship] = useState("");
  const [container, setContainer] = useState("40HC");
  const [costPerCntr, setCostPerCntr] = useState("");
  const [sellPerCntr, setSellPerCntr] = useState("");
  const [ratePerKgCost, setRatePerKgCost] = useState("");
  const [ratePerKgSell, setRatePerKgSell] = useState("");
  const [minChargeCost, setMinChargeCost] = useState("");
  const [minChargeSell, setMinChargeSell] = useState("");
  const [cost, setCost] = useState("");
  const [sell, setSell] = useState("");
  const [error, setError] = useState(null);

  const resetForm = () => {
    setLane(""); setVendor(""); setTransitDays(""); setTransship("");
    setContainer("40HC"); setCostPerCntr(""); setSellPerCntr("");
    setRatePerKgCost(""); setRatePerKgSell(""); setMinChargeCost(""); setMinChargeSell("");
    setCost(""); setSell(""); setError(null);
  };

  const addRate = () => {
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
  };

  // --- Rate Kits (Bundles) ---
  const [kits, setKits] = useState([
    {
      name: "Asia → US West FCL 40HC – All-In",
      scope: "FCL",
      lane: "THBKK → USLAX",
      components: [
        { charge: "Ocean Freight", basis: "per container", cost: 1200, sell: 1500 },
        { charge: "BAF", basis: "per container", cost: 50, sell: 60 },
        { charge: "THC + Doc", basis: "fixed", cost: 120, sell: 160 },
      ],
    },
  ]);

  const kitTotals = (kit) => {
    const cost = kit.components.reduce((s, c) => s + (Number(c.cost) || 0), 0);
    const sell = kit.components.reduce((s, c) => s + (Number(c.sell) || 0), 0);
    return { cost, sell, ros: rosFrom(cost, sell) };
  };

  const [kitOpen, setKitOpen] = useState(false);
  const [kitName, setKitName] = useState("");
  const [kitScope, setKitScope] = useState("FCL"); // FCL/LCL/Air/Transport/Customs/Multi
  const [kitLane, setKitLane] = useState("");
  const [components, setComponents] = useState([
    { charge: "", basis: "per container", cost: "", sell: "" },
  ]);

  const addComponent = () => setComponents((p) => [...p, { charge: "", basis: "per container", cost: "", sell: "" }]);
  const removeComponent = (idx) => setComponents((p) => p.filter((_, i) => i !== idx));
  const updateComponent = (idx, key, val) => setComponents((p) => p.map((row, i) => i === idx ? { ...row, [key]: val } : row));

  const saveKit = () => {
    if (!kitName.trim()) return;
    const clean = components.filter(c => c.charge && c.cost !== "" && c.sell !== "");
    setKits(prev => ([...prev, { name: kitName, scope: kitScope, lane: kitLane, components: clean }]));
    setKitName(""); setKitScope("FCL"); setKitLane(""); setComponents([{ charge: "", basis: "per container", cost: "", sell: "" }]);
    setKitOpen(false);
  };

  // --- Render helpers ---
  const renderToolbar = () => (
    <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
      <Box display="flex" gap={2} flex={1} maxWidth={{ md: '50%' }}>
        <TextField size="small" fullWidth value={query} onChange={(e)=>setQuery(e.target.value)} label="Search" placeholder="Search by lane or vendor..." />
      </Box>
      <Box display="flex" gap={1.5}>
        <Button variant="outlined" size="small" onClick={downloadTemplate}>Download CSV Template</Button>
        <Button variant="contained" size="small" onClick={onClickUpload}>Upload Rates (CSV)</Button>
        <Button variant="contained" size="small" onClick={()=>setOpen(true)}>Add Rate</Button>
        <Dialog open={open} onClose={()=>setOpen(false)} fullWidth maxWidth="md">
          <DialogTitle>Add {modeTab} Rate</DialogTitle>
          <DialogContent dividers>
            <Box display="flex" flexDirection="column" gap={2} py={0.5}>
              <TextField size="small" label="Lane" value={lane} onChange={(e)=>setLane(e.target.value)} placeholder="e.g. THBKK → USLAX" fullWidth />
              <Box display="grid" gridTemplateColumns={{ xs:'1fr', md:'1fr 1fr' }} gap={2}>
                <TextField size="small" label="Vendor / Carrier" value={vendor} onChange={(e)=>setVendor(e.target.value)} placeholder="e.g. Evergreen / TG" fullWidth />
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                  <TextField size="small" label="Transit Time (days)" value={transitDays} onChange={(e)=>setTransitDays(e.target.value)} inputMode="numeric" placeholder="22" />
                  <TextField size="small" label="Transshipment Port" value={transship} onChange={(e)=>setTransship(e.target.value)} placeholder="e.g. SGSIN" />
                </Box>
              </Box>

              {modeTab === 'FCL' && (
                <Box display="grid" gridTemplateColumns={{ xs:'1fr', md:'1fr 1fr 1fr' }} gap={2}>
                  <TextField size="small" label="Container" value={container} onChange={(e)=>setContainer(e.target.value)} placeholder="20GP / 40GP / 40HC / 45HC" />
                  <TextField size="small" label="Cost / Container (USD)" value={costPerCntr} onChange={(e)=>setCostPerCntr(e.target.value)} inputMode="decimal" placeholder="1200" />
                  <TextField size="small" label="Sell / Container (USD)" value={sellPerCntr} onChange={(e)=>setSellPerCntr(e.target.value)} inputMode="decimal" placeholder="1500" />
                </Box>
              )}

              {(modeTab === 'LCL' || modeTab === 'Air') && (
                <Box display="grid" gridTemplateColumns={{ xs:'1fr', md:'1fr 1fr 1fr 1fr' }} gap={2}>
                  <TextField size="small" label="Cost / Kg" value={ratePerKgCost} onChange={(e)=>setRatePerKgCost(e.target.value)} inputMode="decimal" placeholder="0.15" />
                  <TextField size="small" label="Sell / Kg" value={ratePerKgSell} onChange={(e)=>setRatePerKgSell(e.target.value)} inputMode="decimal" placeholder="0.20" />
                  <TextField size="small" label="Min Charge (Cost)" value={minChargeCost} onChange={(e)=>setMinChargeCost(e.target.value)} inputMode="decimal" placeholder="30" />
                  <TextField size="small" label="Min Charge (Sell)" value={minChargeSell} onChange={(e)=>setMinChargeSell(e.target.value)} inputMode="decimal" placeholder="40" />
                </Box>
              )}

              {(modeTab === 'Transport' || modeTab === 'Customs') && (
                <Box display="grid" gridTemplateColumns={{ xs:'1fr', md:'1fr 1fr' }} gap={2}>
                  <TextField size="small" label="Cost (USD)" value={cost} onChange={(e)=>setCost(e.target.value)} inputMode="decimal" placeholder="120" />
                  <TextField size="small" label="Sell (USD)" value={sell} onChange={(e)=>setSell(e.target.value)} inputMode="decimal" placeholder="160" />
                </Box>
              )}

              {error && <Typography variant="caption" color="error">{error}</Typography>}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button color="inherit" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={addRate}>Save Rate</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );

  const renderTable = () => {
    if (modeTab === "FCL") {
      return (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Lane</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Container</TableCell>
              <TableCell>Transit (d)</TableCell>
              <TableCell>Transship</TableCell>
              <TableCell>Cost / Cntr</TableCell>
              <TableCell>Sell / Cntr</TableCell>
              <TableCell>ROS %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFCL.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.lane}</TableCell>
                <TableCell>{r.vendor || "-"}</TableCell>
                <TableCell>{r.container}</TableCell>
                <TableCell>{r.transitDays ?? "-"}</TableCell>
                <TableCell>{r.transship ?? "-"}</TableCell>
                <TableCell>{r.costPerCntr.toLocaleString()}</TableCell>
                <TableCell>{r.sellPerCntr.toLocaleString()}</TableCell>
                <TableCell sx={{ color: r.ros < 20 ? 'error.main' : 'inherit', fontWeight: r.ros < 20 ? 600 : 400 }}>{r.ros}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
    if (modeTab === "LCL" || modeTab === "Air") {
      const rows = modeTab === "LCL" ? filteredLCL : filteredAir;
      return (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Lane</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Transit (d)</TableCell>
              <TableCell>Transship</TableCell>
              <TableCell>Cost / Kg</TableCell>
              <TableCell>Sell / Kg</TableCell>
              <TableCell>Min Cost</TableCell>
              <TableCell>Min Sell</TableCell>
              <TableCell>ROS %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.lane}</TableCell>
                <TableCell>{r.vendor || "-"}</TableCell>
                <TableCell>{r.transitDays ?? "-"}</TableCell>
                <TableCell>{r.transship ?? "-"}</TableCell>
                <TableCell>{r.ratePerKgCost.toLocaleString()}</TableCell>
                <TableCell>{r.ratePerKgSell.toLocaleString()}</TableCell>
                <TableCell>{r.minChargeCost?.toLocaleString() ?? "-"}</TableCell>
                <TableCell>{r.minChargeSell?.toLocaleString() ?? "-"}</TableCell>
                <TableCell sx={{ color: r.ros < 20 ? 'error.main' : 'inherit', fontWeight: r.ros < 20 ? 600 : 400 }}>{r.ros}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
    const rows = modeTab === "Transport" ? filteredTransport : filteredCustoms;
    return (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Lane</TableCell>
            <TableCell>Vendor</TableCell>
            <TableCell>Transit (d)</TableCell>
            <TableCell>Transship</TableCell>
            <TableCell>Cost</TableCell>
            <TableCell>Sell</TableCell>
            <TableCell>ROS %</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{r.lane}</TableCell>
              <TableCell>{r.vendor || "-"}</TableCell>
              <TableCell>{r.transitDays ?? "-"}</TableCell>
              <TableCell>{r.transship ?? "-"}</TableCell>
              <TableCell>{r.cost.toLocaleString()}</TableCell>
              <TableCell>{r.sell.toLocaleString()}</TableCell>
              <TableCell sx={{ color: r.ros < 20 ? 'error.main' : 'inherit', fontWeight: r.ros < 20 ? 600 : 400 }}>{r.ros}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderTrends = () => {
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
  };

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      <Typography variant="h6">Rate Management Dashboard</Typography>

      <Box>
        <Tabs value={modeTab} onChange={(_,v)=>setModeTab(v)} aria-label="mode tabs" sx={{ minHeight: 36 }}>
          <Tab value="FCL" label="Sea – FCL (per container)" />
          <Tab value="LCL" label="Sea – LCL (per kg)" />
          <Tab value="Air" label="Air (per kg)" />
          <Tab value="Transport" label="Transport" />
          <Tab value="Customs" label="Customs" />
        </Tabs>

        <Box mt={2}>
          <Tabs value={innerTab} onChange={(_,v)=>setInnerTab(v)} aria-label="view tabs" sx={{ minHeight: 36 }}>
            <Tab value="table" label="Rate Table" />
            <Tab value="trends" label="Trends" />
            <Tab value="alerts" label="Alerts" />
          </Tabs>

          <Box mt={2}>
            {innerTab === 'table' && (
              <Card variant="outlined">
                <CardContent sx={{ p:2, display:'flex', flexDirection:'column', gap:2 }}>
                  {renderToolbar()}
                  {importInfo && <Typography variant="caption" color="text.secondary">{importInfo}</Typography>}
                  {renderTable()}
                </CardContent>
              </Card>
            )}

            {innerTab === 'trends' && (
              <Card variant="outlined"><CardContent sx={{ p:2 }}>{renderTrends()}</CardContent></Card>
            )}

            {innerTab === 'alerts' && (
              <Card variant="outlined">
                <CardContent sx={{ p:2 }}>
                  <Typography variant="subtitle1" sx={{ mb:1 }}>Alerts</Typography>
                  <Box component="ul" sx={{ pl:3, m:0 }}>
                    <li><Typography variant="body2">ROS below threshold on current mode</Typography></li>
                    <li><Typography variant="body2">Missing vendor rate on current tab ({modeTab})</Typography></li>
                    <li><Typography variant="body2">Expired contract rate on selected lane</Typography></li>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>
      </Box>

  <Card variant="outlined">
        <CardContent sx={{ p:2, display:'flex', flexDirection:'column', gap:2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
    <Typography variant="subtitle1">Rate Bundles</Typography>
            <Box>
      <Button variant="contained" size="small" onClick={()=>setKitOpen(true)}>Create Bundle</Button>
            </Box>
          </Box>
          <Dialog open={kitOpen} onClose={()=>setKitOpen(false)} fullWidth maxWidth="md">
    <DialogTitle>Create Rate Bundle</DialogTitle>
            <DialogContent dividers>
              <Box display="flex" flexDirection="column" gap={2} py={0.5}>
                <Box display="grid" gridTemplateColumns={{ xs:'1fr', md:'1fr 1fr 1fr' }} gap={2}>
      <TextField size="small" label="Bundle Name" value={kitName} onChange={(e)=>setKitName(e.target.value)} placeholder="e.g. Asia → US West FCL – All-In" />
                  <Box>
                    <Typography variant="caption" sx={{ display:'block', mb:0.5 }}>Scope</Typography>
                    <Select size="small" fullWidth value={kitScope} onChange={(e)=>setKitScope(e.target.value)}>
                      <MenuItem value="FCL">FCL</MenuItem>
                      <MenuItem value="LCL">LCL</MenuItem>
                      <MenuItem value="Air">Air</MenuItem>
                      <MenuItem value="Transport">Transport</MenuItem>
                      <MenuItem value="Customs">Customs</MenuItem>
                      <MenuItem value="Multi">Multi</MenuItem>
                    </Select>
                  </Box>
                  <TextField size="small" label="Lane (optional)" value={kitLane} onChange={(e)=>setKitLane(e.target.value)} placeholder="e.g. THBKK → USLAX or *" />
                </Box>

                <Box>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2">Components</Typography>
                    <Button variant="outlined" size="small" onClick={addComponent}>Add Component</Button>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Charge</TableCell>
                        <TableCell>Basis</TableCell>
                        <TableCell>Cost</TableCell>
                        <TableCell>Sell</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {components.map((c, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ width: 260 }}>
                            <TextField size="small" fullWidth value={c.charge} onChange={(e)=>updateComponent(idx,'charge',e.target.value)} placeholder="e.g. Ocean, BAF, THC, Docs" />
                          </TableCell>
                          <TableCell sx={{ width: 200 }}>
                            <Select size="small" fullWidth value={c.basis} onChange={(e)=>updateComponent(idx,'basis',e.target.value)}>
                              <MenuItem value="per container">per container</MenuItem>
                              <MenuItem value="per kg">per kg</MenuItem>
                              <MenuItem value="per cbm">per cbm</MenuItem>
                              <MenuItem value="fixed">fixed</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell sx={{ width: 140 }}>
                            <TextField size="small" fullWidth value={c.cost} onChange={(e)=>updateComponent(idx,'cost',e.target.value)} inputProps={{ inputMode:'decimal' }} placeholder="0" />
                          </TableCell>
                          <TableCell sx={{ width: 140 }}>
                            <TextField size="small" fullWidth value={c.sell} onChange={(e)=>updateComponent(idx,'sell',e.target.value)} inputProps={{ inputMode:'decimal' }} placeholder="0" />
                          </TableCell>
                          <TableCell align="right">
                            <Button size="small" color="inherit" onClick={()=>removeComponent(idx)}>Remove</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            </DialogContent>
      <DialogActions sx={{ justifyContent:'space-between' }}>
              <Typography variant="caption" color="text.secondary">
                {(() => { const {cost,sell,ros}=kitTotals({components}); return `Preview Total: Cost ${cost||0} | Sell ${sell||0} | ROS ${ros||0}%`; })()}
              </Typography>
              <Box>
        <Button color="inherit" onClick={()=>setKitOpen(false)}>Cancel</Button>
        <Button variant="contained" onClick={saveKit} sx={{ ml:1 }}>Save Bundle</Button>
              </Box>
            </DialogActions>
          </Dialog>

          <Table size="small">
            <TableHead>
              <TableRow>
        <TableCell>Bundle Name</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell>Lane</TableCell>
                <TableCell># Components</TableCell>
                <TableCell>Total Cost</TableCell>
                <TableCell>Total Sell</TableCell>
                <TableCell>ROS %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {kits.map((k, i) => {
                const t = kitTotals(k);
                return (
                  <TableRow key={i}>
                    <TableCell>{k.name}</TableCell>
                    <TableCell>{k.scope}</TableCell>
                    <TableCell>{k.lane || '-'}</TableCell>
                    <TableCell>{k.components.length}</TableCell>
                    <TableCell>{t.cost.toLocaleString()}</TableCell>
                    <TableCell>{t.sell.toLocaleString()}</TableCell>
                    <TableCell sx={{ color: t.ros < 20 ? 'error.main' : 'inherit', fontWeight: t.ros < 20 ? 600 : 400 }}>{t.ros}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* hidden file input for CSV */}
      <Box component="input" ref={fileInputRef} type="file" accept=".csv" onChange={handleFile} sx={{ display:'none' }} />
    </Box>
  );
}
