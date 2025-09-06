import React from 'react';
import { Box, Typography, Card, CardHeader, CardContent, Button, Table, TableHead, TableRow, TableCell, TableBody, TextField, Select, MenuItem, FormControl, InputLabel, IconButton, Tooltip, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import SaveIcon from '@mui/icons-material/Save';

const BASIS = ['Per B/L','Per D/O','Per 20\'','Per 40\''];
const CURRENCIES = ['USD','THB','SGD','CNY','EUR'];

function loadTariffCharges(){
	if(typeof window==='undefined') return [];
	try{
		const raw = localStorage.getItem('carrierSurcharges');
		if(!raw) return seed();
		const rows = JSON.parse(raw);
		if(Array.isArray(rows)) return rows;
	}catch(e){ console.warn('Failed to parse carrier surcharges, reseeding', e); }
	return seed();
}
function seed(){
	const seedRows = [
		{ id:'MAERSK-EX-BL', carrier:'Maersk', charge:'Export B/L Fee', scope:'Export – Thailand', basis:'Per B/L', currency:'THB', amount:1400, notes:'Documentation fee', active:true },
		{ id:'CMACGM-IM-DO', carrier:'CMA CGM', charge:'Import D/O Fee', scope:'Import – Thailand', basis:'Per D/O', currency:'THB', amount:1400, notes:'Delivery Order issuance', active:true },
		{ id:'HL-SW-BL', carrier:'Hapag-Lloyd', charge:'Switch B/L Fee', scope:'Export – Thailand', basis:'Per B/L', currency:'THB', amount:3000, notes:'Replacement B/L', active:true },
		{ id:'ONE-TELEX', carrier:'ONE', charge:'Telex Release Fee', scope:'Export – Thailand', basis:'Per B/L', currency:'THB', amount:1500, notes:'Release without original', active:true },
		{ id:'EMC-AMD', carrier:'Evergreen', charge:'Amendment Fee', scope:'Export/Import', basis:'Per B/L', currency:'THB', amount:1000, notes:'Documentation change', active:true },
		{ id:'MSC-CORR', carrier:'MSC', charge:'Correction Fee', scope:'Export/Import', basis:'Per B/L', currency:'THB', amount:1500, notes:'Error correction', active:true },
		{ id:'YM-MANIFEST', carrier:'Yang Ming', charge:'Customs Manifest Submission (AFR, AMS, ENS, ACD)', scope:'Export/Import (JP, US, EU)', basis:'Per B/L', currency:'USD', amount:50, notes:'30–50 USD / 1,000–1,200 THB depending on country', active:true },
		{ id:'CMACGM-CIC-20', carrier:'CMA CGM', charge:'CIC (Container Imbalance Charge)', scope:'Inbound to Bangkok', basis:"Per 20'", currency:'USD', amount:70, notes:'Carrier surcharge', active:true },
		{ id:'CMACGM-CIC-40', carrier:'CMA CGM', charge:'CIC (Container Imbalance Charge)', scope:'Inbound to Bangkok', basis:"Per 40'", currency:'USD', amount:140, notes:'Carrier surcharge', active:true }
	];
	try{ localStorage.setItem('carrierSurcharges', JSON.stringify(seedRows)); }catch{ /* ignore */ }
	return seedRows;
}
function saveTariffCharges(rows){ if(typeof window==='undefined') return; try{ localStorage.setItem('carrierSurcharges', JSON.stringify(rows)); }catch(e){ console.error(e); } }

function validate(it){
	const errors={};
	for(const f of ['id','carrier','charge','basis','currency','amount']){
		if(!it[f]) errors[f] = 'Required';
	}
	if(it.amount===''||it.amount==null||isNaN(Number(it.amount))) errors.amount='Numeric';
	return errors;
}

function EditDialog({ open, onClose, initial, onSave, idsInUse }){
	const BLANK = React.useMemo(()=>({ id:'', carrier:'', charge:'', scope:'', basis:'Per B/L', currency:'THB', amount:0, notes:'', active:true }),[]);
	const [it, setIt] = React.useState(()=> initial? { ...BLANK, ...initial } : BLANK);
	const [errors, setErrors] = React.useState({});
	React.useEffect(()=>{ setIt(initial? { ...BLANK, ...initial } : BLANK); setErrors({}); }, [initial, BLANK]);
	function commit(){
		const errs = validate(it);
		if(Object.keys(errs).length){ setErrors(errs); return; }
		const isNew = !initial || (initial.id !== it.id);
		if(isNew && idsInUse.includes(it.id)){
			setErrors({ ...errs, id:'Already exists' });
			return;
		}
		onSave(it);
	}
	return (
		<Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
			<DialogTitle>{initial? 'Edit Tariff Charge' : 'New Tariff Charge'}</DialogTitle>
			<DialogContent dividers>
				<Box display="grid" gridTemplateColumns="repeat(4, minmax(0,1fr))" gap={2}>
					<TextField label="ID" value={it.id||''} onChange={e=>setIt(prev=>({ ...prev, id:e.target.value.trim().toUpperCase() }))} error={!!errors.id} helperText={errors.id||'Unique key'} />
					<TextField label="Carrier" value={it.carrier||''} onChange={e=>setIt({...it, carrier:e.target.value})} error={!!errors.carrier} helperText={errors.carrier||''} />
					<TextField label="Charge" value={it.charge||''} onChange={e=>setIt({...it, charge:e.target.value})} error={!!errors.charge} helperText={errors.charge||''} />
					<TextField label="Scope" value={it.scope||''} onChange={e=>setIt({...it, scope:e.target.value})} />
					<FormControl>
						<InputLabel>Basis</InputLabel>
						<Select label="Basis" value={it.basis||''} onChange={e=>setIt({...it, basis:e.target.value})}>
							{BASIS.map(b=> <MenuItem key={b} value={b}>{b}</MenuItem>)}
						</Select>
					</FormControl>
					<FormControl>
						<InputLabel>Currency</InputLabel>
						<Select label="Currency" value={it.currency||''} onChange={e=>setIt({...it, currency:e.target.value})}>
							{CURRENCIES.map(c=> <MenuItem key={c} value={c}>{c}</MenuItem>)}
						</Select>
					</FormControl>
					<TextField label="Amount" type="number" value={it.amount||0} onChange={e=>setIt({...it, amount:Number(e.target.value||0)})} error={!!errors.amount} helperText={errors.amount||''} />
					<TextField label="Notes/Remarks" value={it.notes||''} onChange={e=>setIt({...it, notes:e.target.value})} sx={{ gridColumn:'1 / span 4' }} />
					<Box display="flex" alignItems="center" gap={1}><Checkbox checked={it.active!==false} onChange={e=>setIt({...it, active:e.target.checked})}/> <Typography variant="body2">Active</Typography></Box>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" onClick={commit} startIcon={<SaveIcon/>}>Save</Button>
			</DialogActions>
		</Dialog>
	);
}

class TariffChargesErrorBoundary extends React.Component {
	constructor(p){ super(p); this.state={ error:null }; }
	static getDerivedStateFromError(error){ return { error }; }
	componentDidCatch(err, info){ console.error('TariffCharges crashed', err, info); }
	render(){ if(this.state.error) return <Box p={2}><Alert severity="error" variant="filled">Tariff Charges failed to load: {String(this.state.error.message||this.state.error)}</Alert></Box>; return this.props.children; }
}

export default function Tariffs(){
	const [rows, setRows] = React.useState(()=> loadTariffCharges());
	const [snack,setSnack] = React.useState({ open:false, ok:true, msg:'' });
	const [q, setQ] = React.useState('');
	const [fCarrier, setFCarrier] = React.useState('');
	const [fCharge, setFCharge] = React.useState('');
	const [fCurrency, setFCurrency] = React.useState('');

	const filtered = React.useMemo(()=>{
		const needle = q.trim().toLowerCase();
		return rows
			.filter(r => !fCarrier || (r.carrier||'').toLowerCase().includes(fCarrier.toLowerCase()))
			.filter(r => !fCharge || (r.charge||'').toLowerCase().includes(fCharge.toLowerCase()))
			.filter(r => !fCurrency || r.currency===fCurrency)
			.filter(r => !needle || [r.id, r.carrier, r.charge, r.scope].filter(Boolean).some(v=> String(v).toLowerCase().includes(needle)));
	}, [rows, q, fCarrier, fCharge, fCurrency]);

	const [formOpen, setFormOpen] = React.useState(false);
	const [editing, setEditing] = React.useState(null);

	function openNew(){ setEditing({ id:'', carrier:'', charge:'', scope:'', basis:'Per B/L', currency:'THB', amount:0, active:true }); setFormOpen(true); }
	function openEdit(row){ setEditing({ ...row }); setFormOpen(true); }
	function onSave(item){
		setRows(prev => {
			const idx = prev.findIndex(x=> x.id===item.id);
			let next;
			if(idx>=0){ next = prev.map(x=> x.id===item.id? item : x); }
			else { next = [item, ...prev]; }
			saveTariffCharges(next);
			return next;
		});
		setFormOpen(false); setSnack({ open:true, ok:true, msg:'Saved.' });
	}
	function onDelete(id){
		const next = rows.filter(r=> r.id!==id);
		saveTariffCharges(next); setRows(next);
		setSnack({ open:true, ok:true, msg:`Deleted ${id}.` });
	}
	function onDuplicate(row){
		const copy = { ...row, id: `${row.id}-COPY` };
		setEditing(copy); setFormOpen(true);
	}
	function exportJSON(){
		const blob = new Blob([JSON.stringify(rows,null,2)],{ type:'application/json' });
		const url = URL.createObjectURL(blob); const a=document.createElement('a');
		a.href=url; a.download='carrier_tariff_charges.json'; a.click(); URL.revokeObjectURL(url);
	}
	function importJSON(e){
		const file = e.target.files?.[0]; if(!file) return;
		const reader = new FileReader();
		reader.onload = ()=>{
			try{
				const parsed = JSON.parse(reader.result);
				if(!Array.isArray(parsed)) throw new Error('JSON must be an array');
				const byId = Object.fromEntries(rows.map(r=> [r.id,r]));
				for(const it of parsed){ if(it.id){ byId[it.id] = it; } }
				const merged = Object.values(byId);
				saveTariffCharges(merged); setRows(merged);
				setSnack({ open:true, ok:true, msg:`Imported ${parsed.length} item(s).` });
			}catch(err){ setSnack({ open:true, ok:false, msg:'Import failed. '+err.message }); }
		};
		reader.readAsText(file);
		e.target.value = '';
	}

	return (
		<TariffChargesErrorBoundary>
			<Box p={2} display="flex" flexDirection="column" gap={2}>
				<Card variant="outlined">
					<CardHeader title="Tariff Charges (Carrier-linked)" subheader="Manage carrier-linked surcharges. Do not enter base freight here (use Rate Table)." />
					<CardContent>
						<Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
							<TextField size="small" label="Search (id/carrier/charge/scope)" value={q} onChange={e=>setQ(e.target.value)} sx={{ minWidth:260 }} />
							<TextField size="small" label="Carrier" value={fCarrier} onChange={e=>setFCarrier(e.target.value)} sx={{ width:160 }} />
							<TextField size="small" label="Charge" value={fCharge} onChange={e=>setFCharge(e.target.value)} sx={{ width:160 }} />
							<FormControl size="small" sx={{ minWidth:120 }}>
								<InputLabel>Currency</InputLabel>
								<Select label="Currency" value={fCurrency} onChange={e=>setFCurrency(e.target.value)}>
									<MenuItem value="">All</MenuItem>
									{CURRENCIES.map(c=> <MenuItem key={c} value={c}>{c}</MenuItem>)}
								</Select>
							</FormControl>
							<Box flex={1} />
							<Tooltip title="Export JSON"><span><Button variant="outlined" startIcon={<FileDownloadIcon/>} onClick={exportJSON}>Export</Button></span></Tooltip>
							<Tooltip title="Import JSON">
								<label>
									<input type="file" accept="application/json" hidden onChange={importJSON} />
									<Button variant="outlined" startIcon={<FileUploadIcon/>} component="span">Import</Button>
								</label>
							</Tooltip>
							<Button variant="contained" startIcon={<AddIcon/>} onClick={openNew}>New Charge</Button>
						</Box>
					</CardContent>
				</Card>
				<Card variant="outlined">
					<CardHeader titleTypographyProps={{ variant:'subtitle1' }} title={`Items (${filtered.length})`} />
					<CardContent sx={{ pt:0 }}>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>ID</TableCell>
									<TableCell>Carrier</TableCell>
									<TableCell>Charge</TableCell>
									<TableCell>Scope</TableCell>
									<TableCell>Basis</TableCell>
									<TableCell>Currency</TableCell>
									<TableCell align="right">Amount</TableCell>
									<TableCell>Notes/Remarks</TableCell>
									<TableCell align="center">Active</TableCell>
									<TableCell align="right">Action</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{filtered.map(row => (
									<TableRow key={row.id} hover>
										<TableCell>{row.id}</TableCell>
										<TableCell>{row.carrier}</TableCell>
										<TableCell>{row.charge}</TableCell>
										<TableCell>{row.scope||'—'}</TableCell>
										<TableCell>{row.basis}</TableCell>
										<TableCell>{row.currency}</TableCell>
										<TableCell align="right">{Number(row.amount||0).toFixed(2)}</TableCell>
										<TableCell>{row.notes||'—'}</TableCell>
										<TableCell align="center"><Checkbox size="small" checked={row.active!==false} onChange={()=>{
											const next = rows.map(r=> r.id===row.id? { ...r, active: !(row.active!==false) } : r);
											saveTariffCharges(next); setRows(next);
										}}/></TableCell>
										<TableCell align="right">
											<Tooltip title="Edit"><IconButton size="small" onClick={()=>openEdit(row)}><EditIcon fontSize="inherit"/></IconButton></Tooltip>
											<Tooltip title="Duplicate"><IconButton size="small" onClick={()=>onDuplicate(row)}><ContentCopyIcon fontSize="inherit"/></IconButton></Tooltip>
											<Tooltip title="Delete"><IconButton size="small" onClick={()=>onDelete(row.id)}><DeleteIcon fontSize="inherit"/></IconButton></Tooltip>
										</TableCell>
									</TableRow>
								))}
								{filtered.length===0 && (
									<TableRow><TableCell colSpan={10}><Typography variant="body2" color="text.secondary">No items match filters.</Typography></TableCell></TableRow>
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<EditDialog
					open={formOpen}
					onClose={()=>setFormOpen(false)}
					initial={editing}
					onSave={onSave}
					idsInUse={rows.map(r=>r.id)}
				/>

				<Snackbar open={snack.open} autoHideDuration={3500} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
					<Alert severity={snack.ok? 'success':'error'} variant="filled" onClose={()=>setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
				</Snackbar>
			</Box>
		</TariffChargesErrorBoundary>
	);
}

