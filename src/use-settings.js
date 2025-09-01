import React from 'react';
import { SettingsContext } from './contexts';
export function useSettings(){ return React.useContext(SettingsContext); }
