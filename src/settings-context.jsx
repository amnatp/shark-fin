import React from 'react';
import { SettingsContext } from './contexts';

// Default configuration prototype (bands + thresholds + misc)
const DEFAULT_SETTINGS = {
  rosBands: [
    { id: 'low', label: 'Low', max: 12, color: 'error' }, // <12
    { id: 'mid', label: 'Mid', min: 12, max: 20, color: 'warning' }, // 12 - <20
    { id: 'high', label: 'High', min: 20, color: 'success' } // >=20
  ],
  autoApproveMin: 15, // ROS >= 15% auto approve
  defaultCurrency: 'USD',
  rosTargetByMode: {
    'Sea FCL': 15,
    'Sea LCL': 15,
    'Air': 15,
    'Transport': 12,
    'Customs': 10
  },
  businessCutoffLocal: '17:30',
  freeTimePolicy: 'Standard free time: 5 days DET / 5 days DEM / 7 days Storage unless otherwise stated.'
};

function loadSettings(){
  try { return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem('appSettings')||'{}')) }; } catch { return DEFAULT_SETTINGS; }
}
function persistSettings(cfg){ try { localStorage.setItem('appSettings', JSON.stringify(cfg)); } catch {/* ignore */} }

// Demo seeding: create a few sample quotation + rates if not present so settings effects are visible
function seedDemoData(){
  try {
    if(!localStorage.getItem('demoSeeded')){
      // Seed some rates across ROS bands
      const demoRates = {
        FCL: [
          { lane:'THBKK → USLAX', vendor:'Evergreen', container:'40HC', costPerCntr:1300, sellPerCntr:1400, ros: Math.round(((1400-1300)/1400)*100) }, // Low (~7%)
          { lane:'THBKK → NLRTM', vendor:'Maersk', container:'40HC', costPerCntr:1100, sellPerCntr:1400, ros: Math.round(((1400-1100)/1400)*100) }, // Mid (~21%)
          { lane:'THBKK → DEHAM', vendor:'ONE', container:'40HC', costPerCntr:900, sellPerCntr:1400, ros: Math.round(((1400-900)/1400)*100) } // High (~36%)
        ],
        LCL: [
          { lane:'THBKK → HKHKG', vendor:'ConsolCo', ratePerKgCost:0.14, ratePerKgSell:0.2, ros: Math.round(((0.2-0.14)/0.2)*100) }, // Mid (30%)
          { lane:'THBKK → CNYTN', vendor:'ConsolCo', ratePerKgCost:0.19, ratePerKgSell:0.2, ros: Math.round(((0.2-0.19)/0.2)*100) } // Low (5%)
        ],
        Air: [
          { lane:'THBKK → SGSIN', vendor:'SQ', ratePerKgCost:1.8, ratePerKgSell:2.0, ros: Math.round(((2-1.8)/2)*100) }, // Low (10%)
          { lane:'THBKK → JPTYO', vendor:'NH', ratePerKgCost:1.5, ratePerKgSell:2.0, ros: Math.round(((2-1.5)/2)*100) }, // Mid (25%)
        ],
        Transport: [
          { lane:'BKK City → Laem Chabang', vendor:'WICE Truck', cost:120, sell:150, ros: Math.round(((150-120)/150)*100) }, // Mid (20%)
          { lane:'BKK City → Ayutthaya', vendor:'Local Truck', cost:95, sell:100, ros: Math.round(((100-95)/100)*100) } // Low (5%)
        ],
        Customs: [
          { lane:'Import TH Port', vendor:'Broker A', cost:45, sell:60, ros: Math.round(((60-45)/60)*100) }, // Mid (25%)
          { lane:'Export TH Port', vendor:'Broker B', cost:30, sell:50, ros: Math.round(((50-30)/50)*100) } // High (40%)
        ]
      };
      ['FCL','LCL','Air','Transport','Customs'].forEach(k=>{
        const keyMap = { FCL:'fclRows', LCL:'lclRows', Air:'airRows', Transport:'transportRows', Customs:'customsRows' };
        const storageKey = keyMap[k];
        if(!localStorage.getItem(storageKey)){
          localStorage.setItem(storageKey, JSON.stringify(demoRates[k]));
        }
      });
      // Seed one quotation spanning lines across bands
      if(!localStorage.getItem('quotations')){
        const q = {
          id:'Q-DEMO-1', status:'draft', salesOwner:'Demo Sales', mode:'Sea FCL', currency:'USD', validFrom:new Date().toISOString().slice(0,10), validTo:new Date().toISOString().slice(0,10),
          lines:[
            { rateId:'THBKK → USLAX / Evergreen', vendor:'Evergreen', origin:'THBKK', destination:'USLAX', unit:'Cntr', qty:1, sell:1400, margin:100, discount:0 },
            { rateId:'THBKK → NLRTM / Maersk', vendor:'Maersk', origin:'THBKK', destination:'NLRTM', unit:'Cntr', qty:1, sell:1400, margin:300, discount:0 }
          ],
          charges:[ { id:'C-DEMO-1', name:'Documentation', basis:'Per Shipment', qty:1, sell:50, margin:30 } ]
        };
        localStorage.setItem('quotations', JSON.stringify([q]));
      }
      localStorage.setItem('demoSeeded','1');
    }
  } catch {/* ignore */}
}

export function SettingsProvider({ children }){
  const [settings, setSettings] = React.useState(()=> loadSettings());
  React.useEffect(()=>{ seedDemoData(); }, []);
  const update = React.useCallback((patch)=> setSettings(s => { const next = { ...s, ...patch }; persistSettings(next); return next; }), []);
  const updateBand = React.useCallback((index, patch)=> setSettings(s => { const bands = s.rosBands.map((b,i)=> i===index? { ...b, ...patch } : b); const next = { ...s, rosBands: bands }; persistSettings(next); return next; }), []);
  return <SettingsContext.Provider value={{ settings, update, updateBand }}>{children}</SettingsContext.Provider>;
}
export default SettingsProvider;
