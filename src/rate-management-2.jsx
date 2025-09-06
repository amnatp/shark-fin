import React, { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
      <div className="flex gap-2 md:w-1/2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by lane or vendor..." />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={downloadTemplate}>Download CSV Template</Button>
        <Button onClick={onClickUpload}>Upload Rates (CSV)</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>Add Rate</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add {modeTab} Rate</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3 py-2">
              <div className="grid gap-1">
                <Label htmlFor="lane">Lane</Label>
                <Input id="lane" value={lane} onChange={(e) => setLane(e.target.value)} placeholder="e.g. THBKK → USLAX" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label htmlFor="vendor">Vendor / Carrier</Label>
                  <Input id="vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Evergreen / TG" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <Label htmlFor="tt">Transit Time (days)</Label>
                    <Input id="tt" value={transitDays} onChange={(e) => setTransitDays(e.target.value)} inputMode="numeric" placeholder="e.g. 22" />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="ts">Transshipment Port</Label>
                    <Input id="ts" value={transship} onChange={(e) => setTransship(e.target.value)} placeholder="e.g. SGSIN" />
                  </div>
                </div>
              </div>

              {modeTab === "FCL" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="grid gap-1">
                    <Label htmlFor="container">Container</Label>
                    <Input id="container" value={container} onChange={(e) => setContainer(e.target.value)} placeholder="20GP / 40GP / 40HC / 45HC" />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="cpc">Cost / Container (USD)</Label>
                    <Input id="cpc" value={costPerCntr} onChange={(e) => setCostPerCntr(e.target.value)} inputMode="decimal" placeholder="1200" />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="spc">Sell / Container (USD)</Label>
                    <Input id="spc" value={sellPerCntr} onChange={(e) => setSellPerCntr(e.target.value)} inputMode="decimal" placeholder="1500" />
                  </div>
                </div>
              )}

              {(modeTab === "LCL" || modeTab === "Air") && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="grid gap-1">
                    <Label htmlFor="rpc">Cost / Kg</Label>
                    <Input id="rpc" value={ratePerKgCost} onChange={(e) => setRatePerKgCost(e.target.value)} inputMode="decimal" placeholder="0.15" />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="rps">Sell / Kg</Label>
                    <Input id="rps" value={ratePerKgSell} onChange={(e) => setRatePerKgSell(e.target.value)} inputMode="decimal" placeholder="0.20" />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="mcc">Min Charge (Cost)</Label>
                    <Input id="mcc" value={minChargeCost} onChange={(e) => setMinChargeCost(e.target.value)} inputMode="decimal" placeholder="30" />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="mcs">Min Charge (Sell)</Label>
                    <Input id="mcs" value={minChargeSell} onChange={(e) => setMinChargeSell(e.target.value)} inputMode="decimal" placeholder="40" />
                  </div>
                </div>
              )}

              {(modeTab === "Transport" || modeTab === "Customs") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <Label htmlFor="cost">Cost (USD)</Label>
                    <Input id="cost" value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" placeholder="120" />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="sell">Sell (USD)</Label>
                    <Input id="sell" value={sell} onChange={(e) => setSell(e.target.value)} inputMode="decimal" placeholder="160" />
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={addRate}>Save Rate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );

  const renderTable = () => {
    if (modeTab === "FCL") {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lane</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Container</TableHead>
              <TableHead>Transit (d)</TableHead>
              <TableHead>Transship</TableHead>
              <TableHead>Cost / Cntr</TableHead>
              <TableHead>Sell / Cntr</TableHead>
              <TableHead>ROS %</TableHead>
            </TableRow>
          </TableHeader>
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
                <TableCell className={r.ros < 20 ? "text-red-600 font-medium" : ""}>{r.ros}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
    if (modeTab === "LCL" || modeTab === "Air") {
      const rows = modeTab === "LCL" ? filteredLCL : filteredAir;
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lane</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Transit (d)</TableHead>
              <TableHead>Transship</TableHead>
              <TableHead>Cost / Kg</TableHead>
              <TableHead>Sell / Kg</TableHead>
              <TableHead>Min Cost</TableHead>
              <TableHead>Min Sell</TableHead>
              <TableHead>ROS %</TableHead>
            </TableRow>
          </TableHeader>
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
                <TableCell className={r.ros < 20 ? "text-red-600 font-medium" : ""}>{r.ros}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
    const rows = modeTab === "Transport" ? filteredTransport : filteredCustoms;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lane</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Transit (d)</TableHead>
            <TableHead>Transship</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Sell</TableHead>
            <TableHead>ROS %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{r.lane}</TableCell>
              <TableCell>{r.vendor || "-"}</TableCell>
              <TableCell>{r.transitDays ?? "-"}</TableCell>
              <TableCell>{r.transship ?? "-"}</TableCell>
              <TableCell>{r.cost.toLocaleString()}</TableCell>
              <TableCell>{r.sell.toLocaleString()}</TableCell>
              <TableCell className={r.ros < 20 ? "text-red-600 font-medium" : ""}>{r.ros}%</TableCell>
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
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Rate Management Dashboard</h1>

      <Tabs value={modeTab} onValueChange={(v) => setModeTab(v)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="FCL">Sea – FCL (per container)</TabsTrigger>
          <TabsTrigger value="LCL">Sea – LCL (per kg)</TabsTrigger>
          <TabsTrigger value="Air">Air (per kg)</TabsTrigger>
          <TabsTrigger value="Transport">Transport</TabsTrigger>
          <TabsTrigger value="Customs">Customs</TabsTrigger>
        </TabsList>

        <TabsContent value={modeTab}>
          <Tabs defaultValue="table" className="space-y-4">
            <TabsList>
              <TabsTrigger value="table">Rate Table</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="table">
              <Card>
                <CardContent className="p-4 space-y-4">
                  {renderToolbar()}
                  {importInfo && <div className="text-sm text-muted-foreground">{importInfo}</div>}
                  {renderTable()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends">
              <Card><CardContent className="p-4">{renderTrends()}</CardContent></Card>
            </TabsContent>

            <TabsContent value="alerts">
              <Card>
                <CardContent className="p-4">
                  <h2 className="font-semibold mb-4">Alerts</h2>
                  <ul className="list-disc ml-5 text-sm space-y-1">
                    <li>ROS below threshold on current mode</li>
                    <li>Missing vendor rate on current tab ({modeTab})</li>
                    <li>Expired contract rate on selected lane</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Rate Kits section */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Rate Kits (Bundles)</h2>
            <Dialog open={kitOpen} onOpenChange={setKitOpen}>
              <DialogTrigger asChild><Button>Create Kit</Button></DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Create Rate Kit</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="grid gap-1">
                      <Label htmlFor="kitname">Kit Name</Label>
                      <Input id="kitname" value={kitName} onChange={(e)=>setKitName(e.target.value)} placeholder="e.g. Asia → US West FCL – All-In" />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="kitscope">Scope</Label>
                      <select id="kitscope" className="border rounded px-3 py-2" value={kitScope} onChange={(e)=>setKitScope(e.target.value)}>
                        <option>FCL</option>
                        <option>LCL</option>
                        <option>Air</option>
                        <option>Transport</option>
                        <option>Customs</option>
                        <option>Multi</option>
                      </select>
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="kitlane">Lane (optional)</Label>
                      <Input id="kitlane" value={kitLane} onChange={(e)=>setKitLane(e.target.value)} placeholder="e.g. THBKK → USLAX or *" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Components</h3>
                      <Button variant="secondary" onClick={addComponent}>Add Component</Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Charge</TableHead>
                          <TableHead>Basis</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Sell</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {components.map((c, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Input value={c.charge} onChange={(e)=>updateComponent(idx,'charge',e.target.value)} placeholder="e.g. Ocean, BAF, THC, Docs" />
                            </TableCell>
                            <TableCell>
                              <select className="border rounded px-3 py-2 w-full" value={c.basis} onChange={(e)=>updateComponent(idx,'basis',e.target.value)}>
                                <option value="per container">per container</option>
                                <option value="per kg">per kg</option>
                                <option value="per cbm">per cbm</option>
                                <option value="fixed">fixed</option>
                              </select>
                            </TableCell>
                            <TableCell>
                              <Input value={c.cost} onChange={(e)=>updateComponent(idx,'cost',e.target.value)} inputMode="decimal" placeholder="0" />
                            </TableCell>
                            <TableCell>
                              <Input value={c.sell} onChange={(e)=>updateComponent(idx,'sell',e.target.value)} inputMode="decimal" placeholder="0" />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" onClick={()=>removeComponent(idx)}>Remove</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <DialogFooter>
                  <div className="mr-auto text-sm text-muted-foreground">
                    {(() => { const {cost,sell,ros}=kitTotals({components}); return `Preview Total: Cost ${cost||0} | Sell ${sell||0} | ROS ${ros||0}%`; })()}
                  </div>
                  <Button variant="secondary" onClick={()=>setKitOpen(false)}>Cancel</Button>
                  <Button onClick={saveKit}>Save Kit</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kit Name</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Lane</TableHead>
                <TableHead># Components</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Total Sell</TableHead>
                <TableHead>ROS %</TableHead>
              </TableRow>
            </TableHeader>
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
                    <TableCell className={t.ros < 20 ? 'text-red-600 font-medium' : ''}>{t.ros}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* hidden file input for CSV */}
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
    </div>
  );
}
