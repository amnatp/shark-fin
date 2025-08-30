import React, { useState, Children, cloneElement, isValidElement } from 'react';

// Context-less lightweight tabs. Pass value / onValueChange for controlled; or defaultValue for uncontrolled.
export function Tabs({ value, onValueChange, defaultValue, children, className='' }) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value !== undefined ? value : internal;
  const setVal = (v) => {
    if (onValueChange) onValueChange(v); else setInternal(v);
  };

  return (
    <div className={className} data-tabs-value={current}>
      {Children.map(children, child => {
        if (!isValidElement(child)) return child;
        if (child.type === TabsList) {
          return cloneElement(child, { current, setVal });
        }
        if (child.type === TabsContent) {
          return cloneElement(child, { active: child.props.value === current });
        }
        return child;
      })}
    </div>
  );
}

export function TabsList({ children, current, setVal }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {Children.map(children, child => {
        if (!isValidElement(child)) return child;
        if (child.type === TabsTrigger) {
          return cloneElement(child, { current, setVal });
        }
        return child;
      })}
    </div>
  );
}

export function TabsTrigger({ children, value, current, setVal }) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => setVal?.(value)}
      aria-selected={active}
      className={"px-3 py-1 rounded text-sm border focus:outline-none focus:ring " + (active? 'bg-blue-600 text-white border-blue-600':'bg-white hover:bg-gray-50')}
    >
      {children}
    </button>
  );
}

export function TabsContent({ children, value, active }) {
  if (!active) return null;
  return <div className="mt-2">{children}</div>;
}