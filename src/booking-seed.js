// Sample booking seeder for testing shipping instruction workflow
export function seedSampleBookings() {
  const existingBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  
  // Check if sample data already exists
  const sampleExists = existingBookings.some(b => b.id.startsWith('B-DEMO-'));
  
  if (sampleExists) {
    console.log('Sample bookings already exist, skipping seed.');
    return existingBookings;
  }

  const sampleBookings = [
    {
      id: 'B-DEMO-001',
      quotationId: 'Q-DEMO-001',
      customer: 'ACME Corp',
      customerName: 'ACME Corp',
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
      createdAt: new Date().toISOString(),
      parties: {
        shipper: 'ACME Corp',
        consignee: 'Shanghai Trading Co',
        notify: 'Shanghai Trading Co'
      },
      locations: {
        pickupAddress: '123 Main St, Los Angeles, CA',
        deliveryAddress: '456 Port Rd, Shanghai, China'
      },
      cargo: {
        description: 'Electronic Components',
        hsCode: '8542.31',
        packages: 10,
        weightKg: 500,
        volumeM3: 2.5
      },
      dates: {
        readyDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        etdPreferred: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        etaPreferred: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      references: {
        customerRef: 'ACME-PO-001',
        internalRef: 'INT-001'
      },
      notes: 'Handle with care - fragile electronics',
      containers: {
        '20DC': 2,
        '40DC': 1,
        '40HC': 0
      },
      lines: [{
        idx: 0,
        rateId: 'R-COSCO-LAX-SHA',
        vendor: 'COSCO',
        carrier: 'COSCO',
        lane: 'LAX → SHA',
        unit: '20GP',
        qty: 1,
        sell: 2500,
        discount: 0,
        margin: 500,
        ros: 20
      }],
      totals: {
        sell: 2500,
        margin: 500,
        ros: 20
      }
    },
    {
      id: 'B-DEMO-002',
      quotationId: 'Q-DEMO-002',
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
      status: 'DRAFT',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      parties: {
        shipper: 'TechFlow Inc',
        consignee: 'Tokyo Electronics Ltd',
        notify: 'Tokyo Electronics Ltd'
      },
      locations: {
        pickupAddress: '789 Tech Ave, New York, NY',
        deliveryAddress: '321 Tech Blvd, Tokyo, Japan'
      },
      cargo: {
        description: 'Computer Equipment',
        hsCode: '8471.30',
        packages: 5,
        pieces: 15,
        weightKg: 150,
        volumeM3: 1.2
      },
      dates: {
        readyDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        etdPreferred: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        etaPreferred: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      references: {
        customerRef: 'TF-2024-089',
        internalRef: 'INT-002'
      },
      notes: 'Urgent delivery required',
      lines: [{
        idx: 0,
        rateId: 'R-JAL-JFK-NRT',
        vendor: 'Japan Airlines',
        carrier: 'Japan Airlines',
        lane: 'JFK → NRT',
        unit: 'KG',
        qty: 150,
        sell: 4.50,
        discount: 0,
        margin: 0.75,
        ros: 16.7
      }],
      totals: {
        sell: 675,
        margin: 112.5,
        ros: 16.7
      }
    },
    {
      id: 'B-DEMO-003',
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
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      parties: {
        shipper: 'Hong Kong Textiles Ltd',
        consignee: 'Global Textiles',
        notify: 'Global Textiles'
      },
      locations: {
        pickupAddress: 'Factory District, Hong Kong',
        deliveryAddress: '555 Import Blvd, Los Angeles, CA'
      },
      cargo: {
        description: 'Cotton Fabrics',
        hsCode: '5208.12',
        packages: 200,
        pallets: 8,
        weightKg: 8000,
        volumeM3: 25,
        dimensions: {
          width: 120,
          length: 100,
          height: 180
        }
      },
      dates: {
        readyDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        etdPreferred: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        etaPreferred: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      references: {
        customerRef: 'GT-IMP-2024-156',
        internalRef: 'INT-003'
      },
      notes: 'Regular customer - priority handling',
      // LCL shipment - no containers
      lines: [{
        idx: 0,
        rateId: 'R-EVG-HKG-LAX',
        vendor: 'Evergreen',
        carrier: 'Evergreen',
        lane: 'HKG → LAX',
        unit: 'CBM',
        qty: 25,
        sell: 72,
        discount: 4,
        margin: 12,
        ros: 17.6
      }],
      totals: {
        sell: 1800,
        margin: 300,
        ros: 16.7
      }
    }
  ];

  // Merge with existing bookings (add sample bookings to existing ones)
  const allBookings = [...existingBookings, ...sampleBookings];
  localStorage.setItem('bookings', JSON.stringify(allBookings));
  
  // Dispatch events to notify components
  try {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('bookingsUpdated'));
  } catch (err) {
    console.warn('Could not dispatch events:', err);
  }

  console.log('Sample bookings seeded:', sampleBookings.length);
  console.log('Total bookings now:', allBookings.length);
  
  return allBookings;
}

// Quick function to clear bookings for testing
export function clearBookings() {
  localStorage.removeItem('bookings');
  localStorage.removeItem('shippingInstructions');
  try {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('bookingsUpdated'));
  } catch (err) {
    console.warn('Could not dispatch events:', err);
  }
  console.log('Bookings and shipping instructions cleared');
}

// Seed a minimal demo booking for a specific customer so Customer users see data
export function seedCustomerDemoBookings({ customerCode, customerName }) {
  try {
    const code = String(customerCode || '').toUpperCase();
    const name = customerName || customerCode || 'Customer';
    const existing = JSON.parse(localStorage.getItem('bookings') || '[]');
    const alreadyHas = existing.some(b => String(b.customerCode || '').toUpperCase() === code);
    if (!code) return existing;
    if (alreadyHas) return existing;

    const id = `B-${code}-001`;
    const nowIso = new Date().toISOString();
    const demo = {
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
      displayDestination: 'LAX',
      origin: 'HKG',
      destination: 'LAX',
      pol: 'HKG',
      pod: 'LAX',
      carrier: 'Evergreen',
      status: 'REQUESTED',
      createdAt: nowIso,
      cargo: {
        description: 'Textile rolls',
        packages: 120,
        pallets: 6,
        weightKg: 4200,
        volumeM3: 18
      },
      lines: [{
        idx: 0,
        rateId: 'R-DEMO-HKG-LAX',
        vendor: 'Evergreen',
        carrier: 'Evergreen',
        lane: 'HKG → LAX',
        unit: 'CBM',
        qty: 18,
        sell: 70,
        discount: 0,
        margin: 10,
        ros: 14.3
      }],
      totals: { sell: 1260, margin: 180, ros: 14.3 }
    };

    const next = [...existing, demo];
    localStorage.setItem('bookings', JSON.stringify(next));
    try {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('bookingsUpdated'));
    } catch {}
    return next;
  } catch {
    return JSON.parse(localStorage.getItem('bookings') || '[]');
  }
}