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

export function SettingsProvider({ children }){
  const [settings, setSettings] = React.useState(()=> loadSettings());
  const update = React.useCallback((patch)=> setSettings(s => { const next = { ...s, ...patch }; persistSettings(next); return next; }), []);
  const updateBand = React.useCallback((index, patch)=> setSettings(s => { const bands = s.rosBands.map((b,i)=> i===index? { ...b, ...patch } : b); const next = { ...s, rosBands: bands }; persistSettings(next); return next; }), []);
  return <SettingsContext.Provider value={{ settings, update, updateBand }}>{children}</SettingsContext.Provider>;
}
export default SettingsProvider;
