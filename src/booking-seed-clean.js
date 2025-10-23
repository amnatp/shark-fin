// Clean booking seed helpers: provides sample data for demos and customer-specific seeding.

// Seed general sample bookings (shared demo data)
export function seedSampleBookings() {
  const existing = JSON.parse(localStorage.getItem('bookings') || '[]');
  const sampleExists = existing.some(b => (b?.id || '').startsWith('B-DEMO-'));
  if (sampleExists) return existing;

  const nowIso = new Date().toISOString();

  const sampleBookings = [
    // FCL sample (CUSTA so customer.ace can see it)
    {
      id: 'B-DEMO-001',
      quotationId: 'Q-DEMO-001',
      customer: 'Customer ACE Logistics',
      customerName: 'Customer ACE Logistics',
      customerCode: 'CUSTA',
      mode: 'Ocean',
      serviceType: 'FCL',
      incoterm: 'EXW',
      scope: 'Port to Port',
      displayOrigin: 'LAX',
      displayDestination: 'SHA',
      origin: 'LAX',
      destination: 'SHA',
      pol: 'LAX',
      pod: 'SHA',
      carrier: 'COSCO',
      status: 'CONFIRMED',
      createdAt: nowIso,
      parties: { shipper: 'ACME Corp', consignee: 'Shanghai Trading Co', notify: 'Shanghai Trading Co' },
      locations: { pickupAddress: '123 Main St, Los Angeles, CA', deliveryAddress: '456 Port Rd, Shanghai, China' },
      cargo: { description: 'Electronic Components', hsCode: '8542.31', packages: 10, weightKg: 500, volumeM3: 2.5 },
      containers: { '20DC': 2, '40DC': 1, '40HC': 0 },
      lines: [ { idx: 0, rateId: 'R-COSCO-LAX-SHA', vendor: 'COSCO', carrier: 'COSCO', lane: 'LAX → SHA', unit: '20GP', qty: 1, sell: 2500, discount: 0, margin: 500, ros: 20 } ],
      totals: { sell: 2500, margin: 500, ros: 20 }
    },
    // Air sample
    {
      id: 'B-DEMO-005',
      quotationId: null,
      customer: 'TechFlow Inc',
      customerName: 'TechFlow Inc',
      mode: 'Air',
      serviceType: 'Air',
      incoterm: 'FOB',
      scope: 'Door to Door',
      displayOrigin: 'JFK',
      displayDestination: 'NRT',
      origin: 'JFK',
      destination: 'NRT',
      pol: 'JFK',
      pod: 'NRT',
      carrier: 'Japan Airlines',
      status: 'REQUESTED',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      parties: { shipper: 'TechFlow Inc', consignee: 'Tokyo Electronics Ltd', notify: 'Tokyo Electronics Ltd' },
      locations: { pickupAddress: '789 Tech Ave, New York, NY', deliveryAddress: '321 Tech Blvd, Tokyo, Japan' },
      cargo: { description: 'Computer Equipment', hsCode: '8471.30', packages: 5, pieces: 15, weightKg: 150, volumeM3: 1.2 },
      lines: [ { idx: 0, rateId: 'R-JAL-JFK-NRT', vendor: 'Japan Airlines', carrier: 'Japan Airlines', lane: 'JFK → NRT', unit: 'KG', qty: 150, sell: 4.50, discount: 0, margin: 0.75, ros: 16.7 } ],
      totals: { sell: 675, margin: 112.5, ros: 16.7 }
    },
    // LCL sample
    {
      id: 'B-DEMO-006',
      quotationId: null,
      customer: 'Global Textiles',
      customerName: 'Global Textiles',
      mode: 'Ocean',
      serviceType: 'LCL',
      incoterm: 'CIF',
      scope: 'Port to Port',
      displayOrigin: 'HKG',
      displayDestination: 'LAX',
      origin: 'HKG',
      destination: 'LAX',
      pol: 'HKG',
      pod: 'LAX',
      carrier: 'Evergreen',
      status: 'REQUESTED',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      parties: { shipper: 'Hong Kong Textiles Ltd', consignee: 'Global Textiles', notify: 'Global Textiles' },
      locations: { pickupAddress: 'Factory District, Hong Kong', deliveryAddress: '555 Import Blvd, Los Angeles, CA' },
      cargo: { description: 'Cotton Fabrics', hsCode: '5208.12', packages: 200, pallets: 8, weightKg: 8000, volumeM3: 25 },
      lines: [ { idx: 0, rateId: 'R-EVG-HKG-LAX', vendor: 'Evergreen', carrier: 'Evergreen', lane: 'HKG → LAX', unit: 'CBM', qty: 25, sell: 72, discount: 4, margin: 12, ros: 17.6 } ],
      totals: { sell: 1800, margin: 300, ros: 16.7 }
    }
  ];

  const all = [...existing, ...sampleBookings];
  localStorage.setItem('bookings', JSON.stringify(all));
  try {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('bookingsUpdated'));
  } catch (err) {
    console.warn('Could not dispatch events after seedSampleBookings:', err);
  }
  return all;
}

// Clear all booking artifacts (dev/testing aid)
export function clearBookings() {
  localStorage.removeItem('bookings');
  localStorage.removeItem('shippingInstructions');
  try {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('bookingsUpdated'));
  } catch (err) {
    console.warn('Could not dispatch events after clearBookings:', err);
  }
}

// Seed demo bookings (FCL, LCL, Air) for a specific customer so Customer users see data
export function seedCustomerDemoBookings({ customerCode, customerName }) {
  try {
    const code = String(customerCode || '').toUpperCase();
    const name = customerName || customerCode || 'Customer';
    const existing = JSON.parse(localStorage.getItem('bookings') || '[]');
    if (!code) return existing;

    // Only add missing standard demo IDs for this customer
  const wantedIds = [`B-${code}-001`, `B-${code}-002`, `B-${code}-003`, `B-${code}-004`, `B-${code}-005`, `B-${code}-006`, `B-${code}-007`, `B-${code}-008`, `B-${code}-009`, `B-${code}-010`, `B-${code}-011`, `B-${code}-012`, `B-${code}-013`, `B-${code}-014`];
    const existingForCustomer = existing.filter(b => String(b.customerCode || '').toUpperCase() === code);
    const existingIds = new Set(existingForCustomer.map(b => b.id));
    const missingIds = wantedIds.filter(id => !existingIds.has(id));
    if (missingIds.length === 0) return existing;

    const nowIso = new Date().toISOString();

    function createDemo(id) {
      if (id.endsWith('-001')) {
        // FCL booking HKG → LAX
        return {
          id,
          quotationId: null,
          customer: name,
          customerName: name,
          customerCode: code,
          mode: 'Ocean',
          serviceType: 'FCL',
          incoterm: 'FOB',
          scope: 'Port to Door',
          displayOrigin: 'HKG',
          displayDestination: 'LAX',
          origin: 'HKG',
          destination: 'LAX',
          pol: 'HKG',
          pod: 'LAX',
          carrier: 'Evergreen',
          status: 'CONFIRMED',
          createdAt: nowIso,
          parties: { shipper: name, consignee: `${name} Warehouse`, notify: `${name} Warehouse` },
          locations: { pickupAddress: 'Hong Kong Container Terminal', deliveryAddress: 'Customer warehouse, Los Angeles, CA' },
          cargo: { description: 'Consumer goods', hsCode: '6204.62', packages: 240, weightKg: 15000, volumeM3: 35 },
          dates: {
            readyDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            etdPreferred: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            etaPreferred: new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0]
          },
          references: { customerRef: `${code}-FCL-001`, internalRef: 'INT-DEMO-FCL' },
          notes: 'Demo FCL booking for customer',
          containers: { '20DC': 1, '40DC': 0, '40HC': 1 },
          lines: [
            { idx: 0, rateId: 'R-DEMO-HKG-LAX-20', vendor: 'Evergreen', carrier: 'Evergreen', lane: 'HKG → LAX', unit: '20DC', qty: 1, sell: 1800, discount: 0, margin: 300, ros: 16.7 },
            { idx: 1, rateId: 'R-DEMO-HKG-LAX-40HC', vendor: 'Evergreen', carrier: 'Evergreen', lane: 'HKG → LAX', unit: '40HC', qty: 1, sell: 2200, discount: 0, margin: 400, ros: 18.2 }
          ],
          totals: { sell: 4000, margin: 700, ros: 17.5 }
        };
      }
      if (id.endsWith('-002')) {
        // LCL booking SIN → SYD
        return {
          id,
          quotationId: null,
          customer: name,
          customerName: name,
          customerCode: code,
          mode: 'Ocean',
          serviceType: 'LCL',
          incoterm: 'CIF',
          scope: 'Port to Port',
          displayOrigin: 'SIN',
          displayDestination: 'SYD',
          origin: 'SIN',
          destination: 'SYD',
          pol: 'SIN',
          pod: 'SYD',
          carrier: 'ONE',
          status: 'DRAFT',
          createdAt: nowIso,
          parties: { shipper: `${name} Singapore`, consignee: name, notify: name },
          locations: { pickupAddress: 'Singapore Export Hub', deliveryAddress: 'Sydney Import Terminal' },
          cargo: { description: 'Textile products', hsCode: '6109.10', packages: 80, pallets: 4, weightKg: 3200, volumeM3: 12 },
          dates: {
            readyDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
            etdPreferred: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
            etaPreferred: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0]
          },
          references: { customerRef: `${code}-LCL-002`, internalRef: 'INT-DEMO-LCL' },
          notes: 'Demo LCL booking for customer',
          lines: [ { idx: 0, rateId: 'R-DEMO-SIN-SYD', vendor: 'ONE', carrier: 'ONE', lane: 'SIN → SYD', unit: 'CBM', qty: 12, sell: 85, discount: 5, margin: 15, ros: 17.6 } ],
          totals: { sell: 1020, margin: 180, ros: 17.6 }
        };
      }
      if (id.endsWith('-004')) {
        // Additional LCL booking SHA → LAX
        return {
          id,
          quotationId: null,
          customer: name,
          customerName: name,
          customerCode: code,
          mode: 'Ocean',
          serviceType: 'LCL',
          incoterm: 'FOB',
          scope: 'Port to Door',
          displayOrigin: 'SHA',
          displayDestination: 'LAX',
          origin: 'SHA',
          destination: 'LAX',
          pol: 'SHA',
          pod: 'LAX',
          carrier: 'COSCO',
          status: 'REQUESTED',
          createdAt: nowIso,
          parties: { shipper: `${name} Shanghai`, consignee: name, notify: name },
          locations: { pickupAddress: 'Shanghai Port, China', deliveryAddress: 'Customer DC, Los Angeles, CA' },
          cargo: { description: 'Consumer electronics', hsCode: '8517.12', packages: 60, pallets: 3, weightKg: 1800, volumeM3: 10 },
          dates: {
            readyDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
            etdPreferred: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
            etaPreferred: new Date(Date.now() + 26 * 86400000).toISOString().split('T')[0]
          },
          references: { customerRef: `${code}-LCL-004`, internalRef: 'INT-DEMO-LCL-2' },
          notes: 'Second demo LCL booking for customer',
          lines: [ { idx: 0, rateId: 'R-DEMO-SHA-LAX', vendor: 'COSCO', carrier: 'COSCO', lane: 'SHA → LAX', unit: 'CBM', qty: 10, sell: 95, discount: 0, margin: 18, ros: 18.9 } ],
          totals: { sell: 950, margin: 180, ros: 18.9 }
        };
      }
      // Air booking BKK → FRA (default for -003) and extra for -005 PVG → LAX
      if (id.endsWith('-005')) {
        return {
          id,
          quotationId: null,
          customer: name,
          customerName: name,
          customerCode: code,
          mode: 'Air',
          serviceType: 'Air',
          incoterm: 'FOB',
          scope: 'Airport to Airport',
          displayOrigin: 'PVG',
          displayDestination: 'LAX',
          origin: 'PVG',
          destination: 'LAX',
          pol: 'PVG',
          pod: 'LAX',
          carrier: 'China Eastern Cargo',
          status: 'REQUESTED',
          createdAt: nowIso,
          parties: { shipper: `${name} Shanghai`, consignee: `${name} USA`, notify: `${name} USA` },
          locations: { pickupAddress: 'PVG Cargo Terminal, Shanghai', deliveryAddress: 'LAX Cargo, Los Angeles' },
          cargo: { description: 'Smartphones', hsCode: '8517.12', packages: 20, pieces: 200, weightKg: 500, volumeM3: 3.5 },
          dates: {
            readyDate: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
            etdPreferred: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
            etaPreferred: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
          },
          references: { customerRef: `${code}-AIR-005`, internalRef: 'INT-DEMO-AIR-2' },
          notes: 'Extra demo Air booking for customer',
          lines: [ { idx: 0, rateId: 'R-DEMO-PVG-LAX', vendor: 'China Eastern Cargo', carrier: 'China Eastern Cargo', lane: 'PVG → LAX', unit: 'KG', qty: 500, sell: 4.80, discount: 0.10, margin: 0.70, ros: 14.6 } ],
          totals: { sell: 2400, margin: 350, ros: 14.6 }
        };
      }
      if (id.endsWith('-006')) {
        // LCL booking NYC → HAM
        return {
          id,
          quotationId: null,
          customer: name,
          customerName: name,
          customerCode: code,
          mode: 'Ocean',
          serviceType: 'LCL',
          incoterm: 'FOB',
          scope: 'Port to Port',
          displayOrigin: 'NYC',
          displayDestination: 'HAM',
          origin: 'NYC',
          destination: 'HAM',
          pol: 'NYC',
          pod: 'HAM',
          carrier: 'MAERSK',
          status: 'REQUESTED',
          createdAt: nowIso,
          parties: { shipper: `${name} USA`, consignee: `${name} EU`, notify: `${name} EU` },
          locations: { pickupAddress: 'New York Terminal', deliveryAddress: 'Hamburg Import Warehouse' },
          cargo: { description: 'Household goods', hsCode: '9403.20', packages: 50, pallets: 2, weightKg: 1200, volumeM3: 8 },
          dates: {
            readyDate: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
            etdPreferred: new Date(Date.now() + 13 * 86400000).toISOString().split('T')[0],
            etaPreferred: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0]
          },
          references: { customerRef: `${code}-LCL-006`, internalRef: 'INT-DEMO-LCL-3' },
          notes: 'Additional demo LCL booking (NYC → HAM)',
          lines: [ { idx: 0, rateId: 'R-DEMO-NYC-HAM', vendor: 'MAERSK', carrier: 'MAERSK', lane: 'NYC → HAM', unit: 'CBM', qty: 8, sell: 110, discount: 0, margin: 20, ros: 18.2 } ],
          totals: { sell: 880, margin: 160, ros: 18.2 }
        };
      }
      if (id.endsWith('-007')) {
        // LCL booking SHA → NYC
        return {
          id,
          quotationId: null,
          customer: name,
          customerName: name,
          customerCode: code,
          mode: 'Ocean',
          serviceType: 'LCL',
          incoterm: 'CIF',
          scope: 'Port to Door',
          displayOrigin: 'SHA',
          displayDestination: 'NYC',
          origin: 'SHA',
          destination: 'NYC',
          pol: 'SHA',
          pod: 'NYC',
          carrier: 'COSCO',
          status: 'DRAFT',
          createdAt: nowIso,
          parties: { shipper: `${name} Shanghai`, consignee: `${name} USA`, notify: `${name} USA` },
          locations: { pickupAddress: 'Shanghai LCL Terminal', deliveryAddress: 'Customer DC, New Jersey' },
          cargo: { description: 'Home appliances', hsCode: '8516.50', packages: 90, pallets: 5, weightKg: 3500, volumeM3: 14 },
          dates: {
            readyDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
            etdPreferred: new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0],
            etaPreferred: new Date(Date.now() + 23 * 86400000).toISOString().split('T')[0]
          },
          references: { customerRef: `${code}-LCL-007`, internalRef: 'INT-DEMO-LCL-4' },
          notes: 'Additional demo LCL booking (SHA → NYC)',
          lines: [ { idx: 0, rateId: 'R-DEMO-SHA-NYC', vendor: 'COSCO', carrier: 'COSCO', lane: 'SHA → NYC', unit: 'CBM', qty: 14, sell: 88, discount: 3, margin: 12, ros: 15.8 } ],
          totals: { sell: 1232, margin: 168, ros: 13.6 }
        };
      }
      if (id.endsWith('-008')) {
        // LCL booking BKK → LAX
        return {
          id,
          quotationId: null,
          customer: name,
          customerName: name,
          customerCode: code,
          mode: 'Ocean',
          serviceType: 'LCL',
          incoterm: 'FOB',
          scope: 'Port to Door',
          displayOrigin: 'BKK',
          displayDestination: 'LAX',
          origin: 'BKK',
          destination: 'LAX',
          pol: 'BKK',
          pod: 'LAX',
          carrier: 'ONE',
          status: 'REQUESTED',
          createdAt: nowIso,
          parties: { shipper: `${name} Thailand`, consignee: name, notify: name },
          locations: { pickupAddress: 'BKK Port', deliveryAddress: 'Los Angeles Import DC' },
          cargo: { description: 'Footwear', hsCode: '6403.59', packages: 120, pallets: 6, weightKg: 6000, volumeM3: 22 },
          dates: {
            readyDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
            etdPreferred: new Date(Date.now() + 11 * 86400000).toISOString().split('T')[0],
            etaPreferred: new Date(Date.now() + 27 * 86400000).toISOString().split('T')[0]
          },
          references: { customerRef: `${code}-LCL-008`, internalRef: 'INT-DEMO-LCL-5' },
          notes: 'Additional demo LCL booking (BKK → LAX)',
          lines: [ { idx: 0, rateId: 'R-DEMO-BKK-LAX', vendor: 'ONE', carrier: 'ONE', lane: 'BKK → LAX', unit: 'CBM', qty: 22, sell: 90, discount: 0, margin: 14, ros: 15.6 } ],
          totals: { sell: 1980, margin: 308, ros: 15.6 }
        };
      }
      if (id.endsWith('-009')) {
        // LCL booking SGN → SYD
        return {
          id,
          quotationId: null,
          customer: name,
          customerName: name,
          customerCode: code,
          mode: 'Ocean',
          serviceType: 'LCL',
          incoterm: 'CIF',
          scope: 'Port to Port',
          displayOrigin: 'SGN',
          displayDestination: 'SYD',
          origin: 'SGN',
          destination: 'SYD',
          pol: 'SGN',
          pod: 'SYD',
          carrier: 'CMA CGM',
          status: 'REQUESTED',
          createdAt: nowIso,
          parties: { shipper: `${name} Vietnam`, consignee: `${name} Australia`, notify: `${name} Australia` },
          locations: { pickupAddress: 'Cat Lai Terminal, HCMC', deliveryAddress: 'Sydney Import Terminal' },
          cargo: { description: 'Furniture', hsCode: '9401.61', packages: 70, pallets: 5, weightKg: 4200, volumeM3: 18 },
          dates: {
            readyDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            etdPreferred: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
            etaPreferred: new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0]
          },
          references: { customerRef: `${code}-LCL-009`, internalRef: 'INT-DEMO-LCL-6' },
          notes: 'Additional demo LCL booking (SGN → SYD)',
          lines: [ { idx: 0, rateId: 'R-DEMO-SGN-SYD', vendor: 'CMA CGM', carrier: 'CMA CGM', lane: 'SGN → SYD', unit: 'CBM', qty: 18, sell: 84, discount: 2, margin: 13, ros: 15.5 } ],
          totals: { sell: 1512, margin: 234, ros: 15.5 }
        };
      }
      if (id.endsWith('-010')) {
        // LCL booking HKG → SEA
        return {
          id,
          quotationId: null,
          customer: name,
          customerName: name,
          customerCode: code,
          mode: 'Ocean',
          serviceType: 'LCL',
          incoterm: 'FOB',
          scope: 'Port to Door',
          displayOrigin: 'HKG',
          displayDestination: 'SEA',
          origin: 'HKG',
          destination: 'SEA',
          pol: 'HKG',
          pod: 'SEA',
          carrier: 'Evergreen',
          status: 'DRAFT',
          createdAt: nowIso,
          parties: { shipper: 'Hong Kong Trading Co', consignee: `${name} USA`, notify: `${name} USA` },
          locations: { pickupAddress: 'Hong Kong LCL Depot', deliveryAddress: 'Seattle Import CFS' },
          cargo: { description: 'Toys', hsCode: '9503.00', packages: 150, pallets: 6, weightKg: 5000, volumeM3: 20 },
          dates: {
            readyDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
            etdPreferred: new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0],
            etaPreferred: new Date(Date.now() + 22 * 86400000).toISOString().split('T')[0]
          },
          references: { customerRef: `${code}-LCL-010`, internalRef: 'INT-DEMO-LCL-7' },
          notes: 'Additional demo LCL booking (HKG → SEA)',
          lines: [ { idx: 0, rateId: 'R-DEMO-HKG-SEA', vendor: 'Evergreen', carrier: 'Evergreen', lane: 'HKG → SEA', unit: 'CBM', qty: 20, sell: 92, discount: 0, margin: 15, ros: 16.3 } ],
          totals: { sell: 1840, margin: 300, ros: 16.3 }
        };
      }
      if (id.endsWith('-011')) {
        // Air booking HKG → LHR (Cathay Cargo)
        return {
          id,
          quotationId: null,
          customer: name,
          customerName: name,
          customerCode: code,
          mode: 'Air',
          serviceType: 'Air',
          incoterm: 'FOB',
          scope: 'Airport to Airport',
          displayOrigin: 'HKG',
          displayDestination: 'LHR',
          origin: 'HKG',
          destination: 'LHR',
          pol: 'HKG',
          pod: 'LHR',
          carrier: 'Cathay Cargo',
          status: 'REQUESTED',
          createdAt: nowIso,
          parties: { shipper: `${name} Hong Kong`, consignee: `${name} UK`, notify: `${name} UK` },
          locations: { pickupAddress: 'HKG Cargo Terminal', deliveryAddress: 'Heathrow Cargo, London' },
          cargo: { description: 'Computer peripherals', hsCode: '8473.30', packages: 25, pieces: 250, weightKg: 420, volumeM3: 3.2 },
          dates: {
            readyDate: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
            etdPreferred: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
            etaPreferred: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
          },
          references: { customerRef: `${code}-AIR-011`, internalRef: 'INT-DEMO-AIR-3' },
          notes: 'Additional demo Air booking (HKG → LHR)',
          lines: [ { idx: 0, rateId: 'R-DEMO-HKG-LHR', vendor: 'Cathay Cargo', carrier: 'Cathay Cargo', lane: 'HKG → LHR', unit: 'KG', qty: 420, sell: 4.60, discount: 0.10, margin: 0.70, ros: 15.2 } ],
          totals: { sell: 1932, margin: 294, ros: 15.2 }
        };
      }
      if (id.endsWith('-012')) {
        // Air booking JFK → LHR (British Airways Cargo)
        return {
          id,
          quotationId: null,
          customer: name,
          customerName: name,
          customerCode: code,
          mode: 'Air',
          serviceType: 'Air',
          incoterm: 'EXW',
          scope: 'Airport to Airport',
          displayOrigin: 'JFK',
          displayDestination: 'LHR',
          origin: 'JFK',
          destination: 'LHR',
          pol: 'JFK',
          pod: 'LHR',
          carrier: 'British Airways Cargo',
          status: 'REQUESTED',
          createdAt: nowIso,
          parties: { shipper: `${name} USA`, consignee: `${name} UK`, notify: `${name} UK` },
          locations: { pickupAddress: 'JFK Cargo Area D', deliveryAddress: 'Heathrow Cargo, London' },
          cargo: { description: 'Pharmaceuticals (ambient)', hsCode: '3004.90', packages: 10, pieces: 120, weightKg: 280, volumeM3: 2.0 },
          dates: {
            readyDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
            etdPreferred: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
            etaPreferred: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0]
          },
          references: { customerRef: `${code}-AIR-012`, internalRef: 'INT-DEMO-AIR-4' },
          notes: 'Additional demo Air booking (JFK → LHR)',
          lines: [ { idx: 0, rateId: 'R-DEMO-JFK-LHR', vendor: 'British Airways Cargo', carrier: 'British Airways Cargo', lane: 'JFK → LHR', unit: 'KG', qty: 280, sell: 5.10, discount: 0.00, margin: 0.75, ros: 14.7 } ],
          totals: { sell: 1428, margin: 210, ros: 14.7 }
        };
      }
      if (id.endsWith('-013')) {
        // Air booking SIN → SYD (Qantas)
        return {
          id,
          quotationId: null,
          customer: name,
          customerName: name,
          customerCode: code,
          mode: 'Air',
          serviceType: 'Air',
          incoterm: 'FOB',
          scope: 'Airport to Airport',
          displayOrigin: 'SIN',
          displayDestination: 'SYD',
          origin: 'SIN',
          destination: 'SYD',
          pol: 'SIN',
          pod: 'SYD',
          carrier: 'Qantas',
          status: 'REQUESTED',
          createdAt: nowIso,
          parties: { shipper: `${name} Singapore`, consignee: `${name} Australia`, notify: `${name} Australia` },
          locations: { pickupAddress: 'Changi Cargo Complex', deliveryAddress: 'Sydney Cargo Terminal' },
          cargo: { description: 'Healthcare devices', hsCode: '9018.90', packages: 18, pieces: 180, weightKg: 360, volumeM3: 2.6 },
          dates: {
            readyDate: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
            etdPreferred: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
            etaPreferred: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
          },
          references: { customerRef: `${code}-AIR-013`, internalRef: 'INT-DEMO-AIR-5' },
          notes: 'Additional demo Air booking (SIN → SYD)',
          lines: [ { idx: 0, rateId: 'R-DEMO-SIN-SYD-AIR', vendor: 'Qantas', carrier: 'Qantas', lane: 'SIN → SYD', unit: 'KG', qty: 360, sell: 3.90, discount: 0.00, margin: 0.55, ros: 14.1 } ],
          totals: { sell: 1404, margin: 198, ros: 14.1 }
        };
      }
      if (id.endsWith('-014')) {
        // Air booking ICN → LAX (Korean Air Cargo)
        return {
          id,
          quotationId: null,
          customer: name,
          customerName: name,
          customerCode: code,
          mode: 'Air',
          serviceType: 'Air',
          incoterm: 'EXW',
          scope: 'Airport to Airport',
          displayOrigin: 'ICN',
          displayDestination: 'LAX',
          origin: 'ICN',
          destination: 'LAX',
          pol: 'ICN',
          pod: 'LAX',
          carrier: 'Korean Air Cargo',
          status: 'REQUESTED',
          createdAt: nowIso,
          parties: { shipper: `${name} Korea`, consignee: `${name} USA`, notify: `${name} USA` },
          locations: { pickupAddress: 'Incheon Cargo Terminal', deliveryAddress: 'LAX Cargo Facility' },
          cargo: { description: 'Consumer electronics', hsCode: '8528.72', packages: 30, pieces: 300, weightKg: 600, volumeM3: 4.2 },
          dates: {
            readyDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
            etdPreferred: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
            etaPreferred: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0]
          },
          references: { customerRef: `${code}-AIR-014`, internalRef: 'INT-DEMO-AIR-6' },
          notes: 'Additional demo Air booking (ICN → LAX)',
          lines: [ { idx: 0, rateId: 'R-DEMO-ICN-LAX', vendor: 'Korean Air Cargo', carrier: 'Korean Air Cargo', lane: 'ICN → LAX', unit: 'KG', qty: 600, sell: 4.30, discount: 0.05, margin: 0.65, ros: 15.1 } ],
          totals: { sell: 2580, margin: 390, ros: 15.1 }
        };
      }
      return {
        id,
        quotationId: null,
        customer: name,
        customerName: name,
        customerCode: code,
        mode: 'Air',
        serviceType: 'Air',
        incoterm: 'EXW',
        scope: 'Airport to Airport',
        displayOrigin: 'BKK',
        displayDestination: 'FRA',
        origin: 'BKK',
        destination: 'FRA',
        pol: 'BKK',
        pod: 'FRA',
        carrier: 'Lufthansa Cargo',
        status: 'REQUESTED',
        createdAt: nowIso,
        parties: { shipper: `${name} Thailand`, consignee: `${name} Europe`, notify: `${name} Europe` },
        locations: { pickupAddress: 'Suvarnabhumi Cargo Terminal, Bangkok', deliveryAddress: 'Frankfurt Cargo Terminal, Germany' },
        cargo: { description: 'Electronics components', hsCode: '8542.39', packages: 12, pieces: 48, weightKg: 320, volumeM3: 2.8 },
        dates: {
          readyDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
          etdPreferred: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
          etaPreferred: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
        },
        references: { customerRef: `${code}-AIR-003`, internalRef: 'INT-DEMO-AIR' },
        notes: 'Demo Air booking for customer - urgent delivery',
        lines: [ { idx: 0, rateId: 'R-DEMO-BKK-FRA', vendor: 'Lufthansa Cargo', carrier: 'Lufthansa Cargo', lane: 'BKK → FRA', unit: 'KG', qty: 320, sell: 5.20, discount: 0.20, margin: 0.80, ros: 15.4 } ],
        totals: { sell: 1664, margin: 256, ros: 15.4 }
      };
    }

    const toAdd = missingIds.map(createDemo);
    const next = [...existing, ...toAdd];
    localStorage.setItem('bookings', JSON.stringify(next));
    try {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('bookingsUpdated'));
    } catch (err) {
      console.warn('Could not dispatch events after seedCustomerDemoBookings:', err);
    }
    return next;
  } catch (err) {
    console.warn('Error seeding customer demo bookings:', err);
    return JSON.parse(localStorage.getItem('bookings') || '[]');
  }
}
