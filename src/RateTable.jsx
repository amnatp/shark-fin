import { Table, TableBody, TableCell, TableHead, TableRow, Button, Chip, Tooltip } from '@mui/material';
import { useSettings } from './use-settings';

// Unified, mode-aware RateTable with pluggable column registry.
export default function RateTable({ mode, rows, onSelect, onView, onEdit, bookingCounts, hideCostRos, hideRateId }) {
  const { settings } = useSettings() || {};
  const bands = settings?.rosBands || [];
  const autoMin = settings?.autoApproveMin;

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

  const columns = (registry[effectiveMode] ? registry[effectiveMode]() : registry.Transport())
    .filter(col => !col.hidden && col.header !== null);

  return wrapper(<>
    <TableHead>
      <TableRow>
        {columns.map(c => <TableCell key={c.key} sx={headStyles}>{c.header}</TableCell>)}
      </TableRow>
    </TableHead>
    <TableBody>
      {rows.map((r, i) => (
        <TableRow key={r.id || i}>
          {columns.map(c => <TableCell key={c.key}>{typeof c.render === 'function' ? c.render(r, i) : r[c.key]}</TableCell>)}
        </TableRow>
      ))}
    </TableBody>
  </>);
}
