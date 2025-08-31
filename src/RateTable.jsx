import { Table, TableBody, TableCell, TableHead, TableRow, Button } from '@mui/material';

// Shared RateTable component for all modes
export default function RateTable({ mode, rows, onSelect }) {
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

  if (mode === 'FCL') {
    return wrapper(<>
      {commonHead([
        onSelect ? '' : null,
        'Lane','Vendor','Container','Transit (d)','Transship','Cost / Cntr','Sell / Cntr','ROS %','Charge Code','Freetime','Service','Contract Service'
      ].filter(Boolean))}
      <TableBody>
        {rows.map((r,i)=>(
          <TableRow key={i}>
            {onSelect && <TableCell><Button size="small" variant="outlined" onClick={()=>onSelect(r)}>Select</Button></TableCell>}
            <TableCell>{r.lane}</TableCell>
            <TableCell>{r.vendor||'-'}</TableCell>
            <TableCell>{r.container}</TableCell>
            <TableCell>{r.transitDays ?? '-'}</TableCell>
            <TableCell>{r.transship ?? '-'}</TableCell>
            <TableCell>{r.costPerCntr?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell>{r.sellPerCntr?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell sx={negative(r.ros)?{color:'error.main', fontWeight:500}:undefined}>{r.ros ?? '-'}%</TableCell>
            <TableCell>{r.chargeCode || '-'}</TableCell>
            <TableCell>{r.freetime || '-'}</TableCell>
            <TableCell>{r.service || '-'}</TableCell>
            <TableCell>{r.contractService || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>);
  }
  if (mode === 'LCL' || mode === 'Air') {
    return wrapper(<>
      {commonHead([
        onSelect ? '' : null,
        'Lane','Vendor','Transit (d)','Transship','Cost / Kg','Sell / Kg','Min Cost','Min Sell','ROS %','Charge Code'
      ].filter(Boolean))}
      <TableBody>
        {rows.map((r,i)=>(
          <TableRow key={i}>
            {onSelect && <TableCell><Button size="small" variant="outlined" onClick={()=>onSelect(r)}>Select</Button></TableCell>}
            <TableCell>{r.lane}</TableCell>
            <TableCell>{r.vendor||'-'}</TableCell>
            <TableCell>{r.transitDays ?? '-'}</TableCell>
            <TableCell>{r.transship ?? '-'}</TableCell>
            <TableCell>{r.ratePerKgCost?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell>{r.ratePerKgSell?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell>{r.minChargeCost?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell>{r.minChargeSell?.toLocaleString?.() ?? '-'}</TableCell>
            <TableCell sx={negative(r.ros)?{color:'error.main', fontWeight:500}:undefined}>{r.ros ?? '-'}%</TableCell>
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
      onSelect ? '' : null,
      'Lane','Vendor','Transit (d)','Transship','Cost','Sell','ROS %', codeLabel
    ].filter(Boolean))}
    <TableBody>
      {rows.map((r,i)=>(
        <TableRow key={i}>
          {onSelect && <TableCell><Button size="small" variant="outlined" onClick={()=>onSelect(r)}>Select</Button></TableCell>}
          <TableCell>{r.lane}</TableCell>
          <TableCell>{r.vendor||'-'}</TableCell>
          <TableCell>{r.transitDays ?? '-'}</TableCell>
          <TableCell>{r.transship ?? '-'}</TableCell>
          <TableCell>{r.cost?.toLocaleString?.() ?? '-'}</TableCell>
          <TableCell>{r.sell?.toLocaleString?.() ?? '-'}</TableCell>
          <TableCell sx={negative(r.ros)?{color:'error.main', fontWeight:500}:undefined}>{r.ros ?? '-'}%</TableCell>
          {r.chargeCode && <TableCell>{r.chargeCode}</TableCell>}
        </TableRow>
      ))}
    </TableBody>
  </>);
}
