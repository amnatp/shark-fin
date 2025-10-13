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
    const wantedIds = [`B-${code}-001`, `B-${code}-002`, `B-${code}-003`];
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
      // Air booking BKK → FRA
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
