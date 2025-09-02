import { Table, TableBody, TableCell, TableHead, TableRow, Button, Chip, Tooltip } from '@mui/material';
import { useSettings } from './use-settings';

// Shared RateTable component for all modes
export default function RateTable({ mode, rows, onSelect, onView, onEdit, bookingCounts }) {
  const { settings } = useSettings() || {}; // graceful if provider missing
  const bands = settings?.rosBands || [];
  const autoMin = settings?.autoApproveMin;
  function bandFor(v){
    if(v==null) return null;
    return bands.find(b => (b.min==null || v>=b.min) && (b.max==null || v < b.max));
  }
  const headStyles = { fontWeight: 600 };
  const styleFor = (v) => {
    if(v==null) return undefined;
    const b = bandFor(v);
    if(!b) return undefined;
    return { color: b.color === 'error'? 'error.main': b.color==='warning'? 'warning.main': b.color==='success'? 'success.main': undefined, fontWeight:500 };
  };
  const autoApprove = (v) => autoMin!=null && v>=autoMin;
  const commonHead = (cells) => (
    <TableHead>
      <TableRow>
        {cells.map((c,i)=><TableCell key={i} sx={headStyles}>{c}</TableCell>)}
      </TableRow>
    </TableHead>
  );
  const wrapper = (children) => <Table size="small">{children}</Table>;

  const actionsCell = (r) => (
    <TableCell sx={{ whiteSpace:'nowrap' }}>
      {onView && <Button size="small" onClick={()=>onView(r)} sx={{ mr:0.5 }}>View</Button>}
      {onEdit && <Button size="small" variant="outlined" onClick={()=>onEdit(r)}>Edit</Button>}
      {onSelect && <Button size="small" variant="contained" sx={{ ml:0.5 }} onClick={()=>onSelect(r)}>Select</Button>}
    </TableCell>
  );

  function bookingCount(r){
    if(!bookingCounts) return 0;
    const rid = r.rateId || (r.type==='airSheet'? r.id : undefined);
    if(!rid) return 0;
    return bookingCounts[rid] || 0;
  }
  const rateNumber = (r)=> r.rateId || (r.type==='airSheet'? r.id : '') || '-';
  if (mode === 'FCL') {
    return wrapper(<>
      {commonHead([
        (onView||onEdit||onSelect)?'Actions':null,
    'Rate #','Lane','Vendor','Bookings','Container','Transit (d)','Transship','Cost / Cntr','Sell / Cntr','ROS %','Freetime','Service','Contract Service','Charge Code'
      ].filter(Boolean))}
      <TableBody>
        {rows.map((r,i)=>(
          <TableRow key={i}>
            {(onView||onEdit||onSelect) && actionsCell(r)}
            <TableCell>{rateNumber(r)}</TableCell>
            <TableCell>{r.lane}</TableCell>
            <TableCell>{r.vendor||'-'}</TableCell>
            <TableCell>{bookingCount(r) || '-'}</TableCell>
            <TableCell>{r.container}</TableCell>
            <TableCell>{r.transitDays ?? '-'}</TableCell>
            <TableCell>{r.transship ?? '-'}</TableCell>
            <TableCell>{r.costPerCntr?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell>{r.sellPerCntr?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell sx={styleFor(r.ros)}>{r.ros ?? '-'}%{autoApprove(r.ros)?'*':''}</TableCell>
            <TableCell>{r.freetime || '-'}</TableCell>
            <TableCell>{r.service || '-'}</TableCell>
            <TableCell>{r.contractService || '-'}</TableCell>
      <TableCell>{r.chargeCode || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>);
  }
  if (mode === 'LCL') {
    return wrapper(<>
      {commonHead([
        (onView||onEdit||onSelect)?'Actions':null,
    'Rate #','Lane','Vendor','Bookings','Transit (d)','Transship','Cost / Kg','Sell / Kg','Min Cost','Min Sell','ROS %','Charge Code'
      ].filter(Boolean))}
      <TableBody>
        {rows.map((r,i)=>(
          <TableRow key={i}>
            {(onView||onEdit||onSelect) && actionsCell(r)}
      <TableCell>{rateNumber(r)}</TableCell>
      <TableCell>{r.lane}</TableCell>
            <TableCell>{r.vendor||'-'}</TableCell>
            <TableCell>{bookingCount(r) || '-'}</TableCell>
            <TableCell>{r.transitDays ?? '-'}</TableCell>
            <TableCell>{r.transship ?? '-'}</TableCell>
            <TableCell>{r.ratePerKgCost?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell>{r.ratePerKgSell?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell>{r.minChargeCost?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell>{r.minChargeSell?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell sx={styleFor(r.ros)}>{r.ros ?? '-'}%{autoApprove(r.ros)?'*':''}</TableCell>
            <TableCell>{r.chargeCode || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>);
  }
  if (mode === 'Air') {
    // If rows look like airlineSheetRows (have type airSheet) show expanded breaks
    const isSheet = rows.some(r=> r.type === 'airSheet');
    if (isSheet) {
      const BREAKS = [45,100,300,500,1000];
      return wrapper(<>
        {commonHead([
          (onView||onEdit||onSelect)?'Actions':null,
      'Rate #','Lane','Airline','Bookings','Svc','Valid','MIN','≥45','≥100','≥300','≥500','≥1000','Commodities'
        ].filter(Boolean))}
        <TableBody>
          {rows.map((r,i)=> (
            <TableRow key={r.id || i}>
              {(onView||onEdit||onSelect) && actionsCell(r)}
        <TableCell>{rateNumber(r)}</TableCell>
        <TableCell>{r.lane}</TableCell>
              <TableCell>{r.airlineName}</TableCell>
              <TableCell>{bookingCount(r) || '-'}</TableCell>
              <TableCell>{r.serviceType}</TableCell>
              <TableCell>{r.validFrom || '-'} → {r.validTo || '-'}</TableCell>
              <TableCell>{r.minCharge}</TableCell>
              {BREAKS.map(b => <TableCell key={b}>{r.breaks?.[b] ?? '-'}</TableCell>)}
              <TableCell>
                {r.commoditiesCount ? <Tooltip title="Commodity specific tariffs available"><Chip size="small" label={r.commoditiesCount} /> </Tooltip> : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </>);
    }
    // Fallback to simple air rows
    return wrapper(<>
      {commonHead([
        (onView||onEdit||onSelect)?'Actions':null,
    'Rate #','Lane','Vendor','Bookings','Transit (d)','Transship','Cost / Kg','Sell / Kg','Min Cost','Min Sell','ROS %','Charge Code'
      ].filter(Boolean))}
      <TableBody>
        {rows.map((r,i)=>(
          <TableRow key={i}>
            {(onView||onEdit||onSelect) && actionsCell(r)}
      <TableCell>{rateNumber(r)}</TableCell>
      <TableCell>{r.lane}</TableCell>
            <TableCell>{r.vendor||'-'}</TableCell>
            <TableCell>{bookingCount(r) || '-'}</TableCell>
            <TableCell>{r.transitDays ?? '-'}</TableCell>
            <TableCell>{r.transship ?? '-'}</TableCell>
            <TableCell>{r.ratePerKgCost?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell>{r.ratePerKgSell?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell>{r.minChargeCost?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell>{r.minChargeSell?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell sx={styleFor(r.ros)}>{r.ros ?? '-'}%{autoApprove(r.ros)?'*':''}</TableCell>
            <TableCell>{r.chargeCode || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>);
  }
  // Transport/Customs
  const codeLabel = mode === 'Transport' ? 'Charge Code' : mode === 'Customs' ? 'Charge Code' : '';
  return wrapper(<>
    {commonHead([
      (onView||onEdit||onSelect)?'Actions':null,
    'Rate #','Lane','Vendor','Bookings','Transit (d)','Transship','Cost','Sell','ROS %', codeLabel
    ].filter(Boolean))}
    <TableBody>
      {rows.map((r,i)=>(
        <TableRow key={i}>
          {(onView||onEdit||onSelect) && actionsCell(r)}
      <TableCell>{rateNumber(r)}</TableCell>
      <TableCell>{r.lane}</TableCell>
          <TableCell>{r.vendor||'-'}</TableCell>
          <TableCell>{bookingCount(r) || '-'}</TableCell>
          <TableCell>{r.transitDays ?? '-'}</TableCell>
          <TableCell>{r.transship ?? '-'}</TableCell>
          <TableCell>{r.cost?.toLocaleString?.() ?? '-'}</TableCell>
          <TableCell>{r.sell?.toLocaleString?.() ?? '-'}</TableCell>
          <TableCell sx={styleFor(r.ros)}>{r.ros ?? '-'}%{autoApprove(r.ros)?'*':''}</TableCell>
          {r.chargeCode && <TableCell>{r.chargeCode}</TableCell>}
        </TableRow>
      ))}
    </TableBody>
  </>);
}
