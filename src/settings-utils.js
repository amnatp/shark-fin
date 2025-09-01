// Utility helpers for settings-derived logic
export function getRosBand(settings, value){
  if(!settings || value==null) return null;
  return settings.rosBands.find(b => (b.min==null || value>=b.min) && (b.max==null || value < b.max)) || null;
}
