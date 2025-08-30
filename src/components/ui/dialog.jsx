import { useEffect } from 'react';
export function Dialog({ open, onOpenChange, children }) {
  useEffect(()=>{
    function onKey(e){ if(e.key==='Escape') onOpenChange?.(false); }
    if(open) window.addEventListener('keydown', onKey); return ()=> window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);
  if(!open) return null; return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="bg-white rounded shadow max-w-lg w-full mx-4">{children}</div></div>;
}
export function DialogContent({ children }) { return <div>{children}</div>; }
export function DialogHeader({ children }) { return <div className="p-4 border-b">{children}</div>; }
export function DialogTitle({ children }) { return <h2 className="font-semibold">{children}</h2>; }
export function DialogFooter({ children }) { return <div className="p-3 border-t flex justify-end gap-2">{children}</div>; }
export function DialogTrigger({ asChild, children, onClick }) { return asChild ? children : <button onClick={onClick}>{children}</button>; }