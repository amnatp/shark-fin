import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Button, Chip, Tooltip, IconButton, Collapse, Box, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useNavigate } from 'react-router-dom';
import { loadTariffs, onTariffsChanged } from './tariffs-store';
import { useSettings } from './use-settings';

// Unified, mode-aware RateTable with pluggable column registry.
export default function RateTable({ mode, rows, onSelect, onView, onEdit, bookingCounts, hideCostRos, hideRateId }) {
  const { settings } = useSettings() || {};
  const bands = settings?.rosBands || [];
  const autoMin = settings?.autoApproveMin;
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(()=> new Set());
  const [tariffs, setTariffs] = useState(()=> loadTariffs());
  useEffect(()=>{
    const off = onTariffsChanged(setTariffs);
    return off;
  }, []);

  const headStyles = { fontWeight: 600 };
  const BREAKS = [45, 100, 300, 500, 1000];

  const bandFor = (v) => (v == null ? null : bands.find(b => (b.min == null || v >= b.min) && (b.max == null || v < b.max)));
  const styleFor = (v) => {
    if (v == null) return undefined;
    const b = bandFor(v);
    if (!b) return undefined;
    return { color: b.color === 'error' ? 'error.main' : b.color === 'warning' ? 'warning.main' : b.color === 'success' ? 'success.main' : undefined, fontWeight: 500 };
  };
  const autoApprove = (v) => autoMin != null && v >= autoMin;

  const wrapper = (children) => <Table size="small">{children}</Table>;

  const actionsCell = (r) => (
    <TableCell sx={{ whiteSpace: 'nowrap' }}>
      {onView && <Button size="small" onClick={() => onView(r)} sx={{ mr: 0.5 }}>View</Button>}
      {onEdit && <Button size="small" variant="outlined" onClick={() => onEdit(r)}>Edit</Button>}
      {onSelect && <Button size="small" variant="contained" sx={{ ml: 0.5 }} onClick={() => onSelect(r)}>Select</Button>}
    </TableCell>
  );

  const bookingCount = (r) => {
    if (!bookingCounts) return 0;
    const rid = r.rateId || (r.type === 'airSheet' ? r.id : undefined);
    if (!rid) return 0;
    return bookingCounts[rid] || 0;
  };
  const rateNumber = (r) => r.rateId || (r.type === 'airSheet' ? r.id : '') || '-';

  // Determine effective mode (AirSheet vs Air simple)
  const effectiveMode = mode === 'Air' && rows.some(r => r.type === 'airSheet') ? 'AirSheet' : mode;

  // Column registry. Each entry is a function returning an ordered array of column defs.
  // A column def: { key, header, render(row), hidden?:bool }
  const registry = {
    FCL: () => ([
      { key: 'actions', header: (onView||onEdit||onSelect)?'Actions':null, render: actionsCell, hidden: !(onView||onEdit||onSelect) },
      { key: 'rateId', header: 'Rate #', render: r => rateNumber(r), hidden: hideRateId },
      { key: 'lane', header: 'Lane', render: r => r.lane },
      { key: 'vendor', header: 'Vendor', render: r => r.vendor || '-' },
      { key: 'bookings', header: 'Bookings', render: r => bookingCount(r) || '-' },
      { key: 'container', header: 'Container', render: r => r.container },
      { key: 'transit', header: 'Transit (d)', render: r => r.transitDays ?? '-' },
      { key: 'transship', header: 'Transship', render: r => r.transship ?? '-' },
      { key: 'cost', header: 'Cost / Cntr', render: r => r.costPerCntr?.toLocaleString?.() ?? '-', hidden: hideCostRos },
      { key: 'sell', header: 'Sell / Cntr', render: r => r.sellPerCntr?.toLocaleString?.() ?? '-' },
      { key: 'ros', header: 'ROS %', render: r => <span style={styleFor(r.ros)}>{r.ros ?? '-'}{r.ros!=null?'%':''}{autoApprove(r.ros)?'*':''}</span>, hidden: hideCostRos },
      { key: 'freetime', header: 'Freetime', render: r => r.freetime || '-' },
      { key: 'service', header: 'Service', render: r => r.service || '-' },
      { key: 'contractService', header: 'Contract Service', render: r => r.contractService || '-' },
      { key: 'chargeCode', header: 'Charge Code', render: r => r.chargeCode || '-' },
    ]),
    LCL: () => ([
      { key: 'actions', header: (onView||onEdit||onSelect)?'Actions':null, render: actionsCell, hidden: !(onView||onEdit||onSelect) },
      { key: 'rateId', header: 'Rate #', render: r => rateNumber(r), hidden: hideRateId },
      { key: 'lane', header: 'Lane', render: r => r.lane },
      { key: 'vendor', header: 'Vendor', render: r => r.vendor || '-' },
      { key: 'bookings', header: 'Bookings', render: r => bookingCount(r) || '-' },
      { key: 'transit', header: 'Transit (d)', render: r => r.transitDays ?? '-' },
      { key: 'transship', header: 'Transship', render: r => r.transship ?? '-' },
      { key: 'cost', header: 'Cost / Kg', render: r => r.ratePerKgCost?.toLocaleString?.() ?? '-', hidden: hideCostRos },
      { key: 'sell', header: 'Sell / Kg', render: r => r.ratePerKgSell?.toLocaleString?.() ?? '-' },
      { key: 'minCost', header: 'Min Cost', render: r => r.minChargeCost?.toLocaleString?.() ?? '-', hidden: hideCostRos },
      { key: 'minSell', header: 'Min Sell', render: r => r.minChargeSell?.toLocaleString?.() ?? '-' },
      { key: 'ros', header: 'ROS %', render: r => <span style={styleFor(r.ros)}>{r.ros ?? '-'}{r.ros!=null?'%':''}{autoApprove(r.ros)?'*':''}</span>, hidden: hideCostRos },
      { key: 'chargeCode', header: 'Charge Code', render: r => r.chargeCode || '-' },
    ]),
    Air: () => ([ // simple air rows
      { key: 'actions', header: (onView||onEdit||onSelect)?'Actions':null, render: actionsCell, hidden: !(onView||onEdit||onSelect) },
      { key: 'rateId', header: 'Rate #', render: r => rateNumber(r), hidden: hideRateId },
      { key: 'lane', header: 'Lane', render: r => r.lane },
      { key: 'vendor', header: 'Vendor', render: r => r.vendor || '-' },
      { key: 'bookings', header: 'Bookings', render: r => bookingCount(r) || '-' },
      { key: 'transit', header: 'Transit (d)', render: r => r.transitDays ?? '-' },
      { key: 'transship', header: 'Transship', render: r => r.transship ?? '-' },
      { key: 'cost', header: 'Cost / Kg', render: r => r.ratePerKgCost?.toLocaleString?.() ?? '-', hidden: hideCostRos },
      { key: 'sell', header: 'Sell / Kg', render: r => r.ratePerKgSell?.toLocaleString?.() ?? '-' },
      { key: 'minCost', header: 'Min Cost', render: r => r.minChargeCost?.toLocaleString?.() ?? '-', hidden: hideCostRos },
      { key: 'minSell', header: 'Min Sell', render: r => r.minChargeSell?.toLocaleString?.() ?? '-' },
      { key: 'ros', header: 'ROS %', render: r => <span style={styleFor(r.ros)}>{r.ros ?? '-'}{r.ros!=null?'%':''}{autoApprove(r.ros)?'*':''}</span>, hidden: hideCostRos },
      { key: 'chargeCode', header: 'Charge Code', render: r => r.chargeCode || '-' },
    ]),
    AirSheet: () => ([
      { key: 'actions', header: (onView||onEdit||onSelect)?'Actions':null, render: actionsCell, hidden: !(onView||onEdit||onSelect) },
      { key: 'rateId', header: 'Rate #', render: r => rateNumber(r) },
      { key: 'lane', header: 'Lane', render: r => r.lane },
      { key: 'airline', header: 'Airline', render: r => r.airlineName },
      { key: 'bookings', header: 'Bookings', render: r => bookingCount(r) || '-' },
      { key: 'svc', header: 'Svc', render: r => r.serviceType },
      { key: 'valid', header: 'Valid', render: r => `${r.validFrom || '-'} → ${r.validTo || '-'}` },
      { key: 'min', header: 'MIN', render: r => r.minCharge },
      ...BREAKS.map(b => ({ key: `brk_${b}`, header: `≥${b}`, render: r => r.breaks?.[b] ?? '-' })),
      { key: 'commodities', header: 'Commodities', render: r => r.commoditiesCount ? <Tooltip title="Commodity specific tariffs available"><Chip size="small" label={r.commoditiesCount} /></Tooltip> : '-' },
    ]),
    Transport: () => ([
      { key: 'actions', header: (onView||onEdit||onSelect)?'Actions':null, render: actionsCell, hidden: !(onView||onEdit||onSelect) },
      { key: 'rateId', header: 'Rate #', render: r => rateNumber(r), hidden: hideRateId },
      { key: 'lane', header: 'Lane', render: r => r.lane },
      { key: 'vendor', header: 'Vendor', render: r => r.vendor || '-' },
      { key: 'bookings', header: 'Bookings', render: r => bookingCount(r) || '-' },
      { key: 'transit', header: 'Transit (d)', render: r => r.transitDays ?? '-' },
      { key: 'transship', header: 'Transship', render: r => r.transship ?? '-' },
      { key: 'cost', header: 'Cost', render: r => r.cost?.toLocaleString?.() ?? '-', hidden: hideCostRos },
      { key: 'sell', header: 'Sell', render: r => r.sell?.toLocaleString?.() ?? '-' },
      { key: 'ros', header: 'ROS %', render: r => <span style={styleFor(r.ros)}>{r.ros ?? '-'}{r.ros!=null?'%':''}{autoApprove(r.ros)?'*':''}</span>, hidden: hideCostRos },
      { key: 'chargeCode', header: 'Charge Code', render: r => r.chargeCode || '-' },
    ]),
    Customs: () => ([
      { key: 'actions', header: (onView||onEdit||onSelect)?'Actions':null, render: actionsCell, hidden: !(onView||onEdit||onSelect) },
      { key: 'rateId', header: 'Rate #', render: r => rateNumber(r), hidden: hideRateId },
      { key: 'lane', header: 'Lane', render: r => r.lane },
      { key: 'vendor', header: 'Vendor', render: r => r.vendor || '-' },
      { key: 'bookings', header: 'Bookings', render: r => bookingCount(r) || '-' },
      { key: 'transit', header: 'Transit (d)', render: r => r.transitDays ?? '-' },
      { key: 'transship', header: 'Transship', render: r => r.transship ?? '-' },
      { key: 'cost', header: 'Cost', render: r => r.cost?.toLocaleString?.() ?? '-', hidden: hideCostRos },
      { key: 'sell', header: 'Sell', render: r => r.sell?.toLocaleString?.() ?? '-' },
      { key: 'ros', header: 'ROS %', render: r => <span style={styleFor(r.ros)}>{r.ros ?? '-'}{r.ros!=null?'%':''}{autoApprove(r.ros)?'*':''}</span>, hidden: hideCostRos },
      { key: 'chargeCode', header: 'Charge Code', render: r => r.chargeCode || '-' },
    ])
  };

  const baseCols = (registry[effectiveMode] ? registry[effectiveMode]() : registry.Transport())
    .filter(col => !col.hidden && col.header !== null);
  // Prepend expand column
  const columns = [
    { key:'_exp', header:'' , render: (r, i) => (
      <IconButton size="small" onClick={()=>{
        setExpanded(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; });
      }} aria-label="expand row">
        {expanded.has(i) ? <ExpandLessIcon fontSize="small"/> : <ExpandMoreIcon fontSize="small"/>}
      </IconButton>
    )},
    ...baseCols
  ];

  // Helpers to match tariffs to a rate row
  const parseLane = (lane='') => {
    const parts = String(lane).split('→').map(s=>s.trim());
    return { origin: parts[0]||'', destination: parts[1]||'' };
  };
  const matchTradelane = (pattern='', lane='') => {
    if(!pattern) return true; // no pattern set means applies
    const { origin, destination } = parseLane(lane);
    if(pattern.includes('/')){
      const [po, pd] = pattern.split('/');
      const okO = (po==='ALL') || (!!origin && (po.endsWith('*') ? origin.startsWith(po.slice(0,-1)) : origin===po));
      const okD = (pd==='ALL') || (!!destination && (pd.endsWith('*') ? destination.startsWith(pd.slice(0,-1)) : destination===pd));
      return okO && okD;
    }
    if(pattern.includes('→')){
      return pattern.trim() === lane.trim();
    }
    return true;
  };
  const matchEquipment = (eq='ALL', container='') => {
    if(!eq || eq==='ALL') return true; return String(eq).toUpperCase() === String(container||'').toUpperCase();
  };
  const tariffsForRow = (row) => {
    const carrier = (row.vendor||row.airlineName||'').trim(); if(!carrier) return [];
    return tariffs.filter(t => {
      const tc = String(t.carrier||'').toLowerCase();
      const sameCarrier = tc === carrier.toLowerCase();
      if(!sameCarrier) return false;
      const laneOk = matchTradelane(t.tradelane||'', row.lane||'');
      const equipOk = matchEquipment(t.equipment||'ALL', row.container||'');
      return laneOk && equipOk;
    });
  };
  const openTariffsPage = (carrier) => {
    try { localStorage.setItem('tariffsFilterCarrier', carrier||''); } catch {/* ignore */}
    navigate('/tariffs');
  };
  const createTariffFromRow = (row) => {
    const carrier = row.vendor||row.airlineName||'';
    const draft = { carrier, tradelane: row.lane||'', equipment: row.container||'ALL', basis:'Per B/L', currency:'THB', amount:0, notes:'' };
    try { localStorage.setItem('tariffDraft', JSON.stringify(draft)); localStorage.setItem('tariffsFilterCarrier', carrier||''); } catch {/* ignore */}
    navigate('/tariffs');
  };

  return wrapper(<>
    <TableHead>
      <TableRow>
        {columns.map(c => <TableCell key={c.key} sx={headStyles}>{c.header}</TableCell>)}
      </TableRow>
    </TableHead>
    <TableBody>
      {rows.map((r, i) => {
        const tfs = expanded.has(i) ? tariffsForRow(r) : [];
        return (
          <React.Fragment key={r.id || i}>
            <TableRow>
              {columns.map(c => <TableCell key={c.key}>{typeof c.render === 'function' ? c.render(r, i) : r[c.key]}</TableCell>)}
            </TableRow>
            <TableRow>
              <TableCell colSpan={columns.length} sx={{ p: 0, borderBottom: expanded.has(i)? '1px solid rgba(224, 224, 224, 1)':'none' }}>
                <Collapse in={expanded.has(i)} timeout="auto" unmountOnExit>
                  <Box sx={{ p: 1.5, background: 'rgba(0,0,0,0.02)' }}>
                    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb: 1, gap: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight:600 }}>Tariff Surcharges for {r.vendor||r.airlineName||'-'}</Typography>
                      <Box sx={{ display:'flex', gap:1 }}>
                        <Button size="small" variant="text" onClick={()=> createTariffFromRow(r)}>+ New Surcharge</Button>
                        <Button size="small" variant="outlined" onClick={()=> openTariffsPage(r.vendor||r.airlineName||'')}>Open Surcharges</Button>
                      </Box>
                    </Box>
                    {tfs.length === 0 && <Typography variant="caption" color="text.secondary">No matching surcharges.</Typography>}
                    {tfs.length > 0 && (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Charge</TableCell>
                            <TableCell>Tradelane</TableCell>
                            <TableCell>Equip</TableCell>
                            <TableCell>Basis</TableCell>
                            <TableCell>Cur</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell>Notes</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {tfs.map(tf => (
                            <TableRow key={tf.id}>
                              <TableCell>{tf.charge}</TableCell>
                              <TableCell>{tf.tradelane||'—'}</TableCell>
                              <TableCell>{tf.equipment||'ALL'}</TableCell>
                              <TableCell>{tf.basis}</TableCell>
                              <TableCell>{tf.currency}</TableCell>
                              <TableCell align="right">{Number(tf.amount||0).toFixed(2)}</TableCell>
                              <TableCell>{tf.notes||'—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Box>
                </Collapse>
              </TableCell>
            </TableRow>
          </React.Fragment>
        );
      })}
    </TableBody>
  </>);
}
