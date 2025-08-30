export { RateRequestsInbox, default } from './procurement-pricing-rate-requests';
import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Button, Divider, Chip, Card, CardHeader, CardContent,
  Tabs, Tab, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, MenuItem, Select, FormControl, InputLabel, Checkbox
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CompareIcon from '@mui/icons-material/Compare';
import ReplyIcon from '@mui/icons-material/Reply';
import CloseIcon from '@mui/icons-material/Close';

/**
 * PROCUREMENT & PRICING WORKBENCH (MUI)
 *
 * Purpose: Let Procurement/Pricing respond to a "Request Better Rate" raised from the Sales Inquiry Cart Detail page.
 *
 * Screens in this file:
 * 1) <RateRequestsInbox/> — inbox of improvement requests (by status tab)
 * 2) <RateRequestDetail/> — request header, lines, RFQ/quotes collection, vendor comparison,
 *    response & approval form with ROS‑based routing (Director / Top Management), and publish back to Sales.
 *
 * Routing rules (example):
 *  - Proposed ROS < 15%  → Requires Director + Top Management approval
 *  - Proposed ROS < 20%  → Requires Director approval
 *  - Otherwise          → No approval required (can publish directly)
 */

/************** Utilities **************/
function ros(margin, sell){ const s = Number(sell)||0; const m = Number(margin)||0; return s? (m/s)*100 : 0; }
function money(n){ const v = Number(n)||0; return v.toFixed(2); }
function ROSChip({ value }){ const color = value>=20? 'success': value>=12? 'warning':'error'; return <Chip size="small" color={color} label={`${value.toFixed(1)}%`} variant={value>=20?'filled':'outlined'} />; }
function StatusChip({ status }){
  const map = { 'NEW':'default', 'RFQ SENT':'info', 'QUOTES IN':'primary', 'PRICED':'warning', 'AWAITING APPROVAL':'warning', 'APPROVED':'success', 'REPLIED':'success' };
  return <Chip size="small" color={map[status]||'default'} label={status} variant="outlined"/>;
}

/************** Sample Data **************/
const SAMPLE_REQUEST = {
  type: 'rateImprovementRequest',
  id: 'REQ-250830-001',
  createdAt: '2025-08-30T12:34:00Z',
  urgency: 'High',
  remarks: 'Customer pushing for BKK→SGSIN lower buy rate; need +2% ROS vs current.',
  owner: 'sales.amnat',
  totals: { sell: 2130, margin: 320, ros: 15.0 },
  lines: [
    { id:'SHP001', origin:'THBKK', destination:'SGSIN', basis:'Per Container', containerType:'40HC', qty:1, sell:650, margin:80,
      vendorQuotes: [ { vendor:'Maersk', price:560, transit:'5d', remark:'' }, { vendor:'ONE', price:540, transit:'6d', remark:'' } ] },
    { id:'AIR101', origin:'THBKK', destination:'HKHKG', basis:'Per KG', containerType:'—', qty:550, sell:3.20, margin:0.50,
      vendorQuotes: [ { vendor:'TG', price:2.45, transit:'1d' }, { vendor:'CX', price:2.60, transit:'1d' } ] },
    { id:'TRN009', origin:'THBKK', destination:'THRAY', basis:'Per Trip', containerType:'Trailer', qty:1, sell:230, margin:30,
      vendorQuotes: [ { vendor:'ETL-TH', price:185, transit:'1d' }, { vendor:'Local', price:178, transit:'1d' } ] }
  ]
};

/************** Inbox **************/
export function RateRequestsInbox(){
  const [tab, setTab] = React.useState(0);
  const tabs = ['NEW','RFQ SENT','QUOTES IN','PRICED','AWAITING APPROVAL','APPROVED','REPLIED'];
  const rows = [
    { id:'REQ-250830-001', customer:'CP Foods TH', od:'THBKK→SGSIN', mode:'Sea FCL', created:'2025-08-30', urgency:'High', status:'NEW' },
    { id:'REQ-250829-004', customer:'Delta TH', od:'THBKK→HKHKG', mode:'Air', created:'2025-08-29', urgency:'Normal', status:'QUOTES IN' },
  ];
  const filtered = rows.filter(r => tabs[tab]===r.status);
  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      <Typography variant="h6">Rate Improvement Requests</Typography>
      <Tabs value={tab} onChange={(e,v)=>setTab(v)} sx={{ '.MuiTabs-flexContainer':{ flexWrap:'wrap' }}}>
        {tabs.map(t => <Tab key={t} label={t} />)}
      </Tabs>
      <Card variant="outlined">
        <CardHeader title="Inbox"/>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Request</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>OD / Mode</TableCell>
                <TableCell>Urgency</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.customer}</TableCell>
                  <TableCell>{r.od} • {r.mode}</TableCell>
                  <TableCell><Chip size="small" label={r.urgency} color={r.urgency==='High'?'warning':'default'} variant="outlined"/></TableCell>
                  <TableCell><StatusChip status={r.status}/></TableCell>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </Box>
                  );
                }
              }
            }
          }
        }
      }
    }
  }
}
              ))}
