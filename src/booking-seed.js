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
      customer: 'Euro Logistics',
      customerName: 'Euro Logistics',
      mode: 'Ocean',
      serviceType: 'FCL',
      incoterm: 'CIF',
      scope: 'Port to Port',
      displayOrigin: 'SHA',
      displayDestination: 'HAM',
      origin: 'SHA',
      destination: 'HAM',
      pol: 'SHA',
      pod: 'HAM',
      carrier: 'Maersk',
      status: 'CONFIRMED',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      parties: {
        shipper: 'Shanghai Manufacturing Co',
        consignee: 'Euro Logistics',
        notify: 'Euro Logistics'
      },
      locations: {
        pickupAddress: 'Pudong Export Zone, Shanghai, China',
        deliveryAddress: 'Hamburg Port Authority, Hamburg, Germany'
      },
      cargo: {
        description: 'Industrial Machinery',
        hsCode: '8479.89',
        packages: 2,
        weightKg: 18000,
        volumeM3: 45
      },
      dates: {
        readyDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        etdPreferred: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        etaPreferred: new Date(Date.now() + 38 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      references: {
        customerRef: 'EL-2024-445',
        internalRef: 'INT-002'
      },
      notes: 'Heavy machinery - requires crane handling',
      containers: {
        '20DC': 0,
        '40DC': 0,
        '40HC': 1
      },
      lines: [{
        idx: 0,
        rateId: 'R-MSK-SHA-HAM',
        vendor: 'Maersk',
        carrier: 'Maersk',
        lane: 'SHA → HAM',
        unit: '40HC',
        qty: 1,
        sell: 4200,
        discount: 200,
        margin: 800,
        ros: 19.0
      }],
      totals: {
        sell: 4200,
        margin: 800,
        ros: 19.0
      }
    },
    {
      id: 'B-DEMO-004',
      quotationId: 'Q-DEMO-004',
      customer: 'Customer ACE Logistics',
      customerName: 'Customer ACE Logistics',
      customerCode: 'CUSTA',
      mode: 'Ocean',
      serviceType: 'FCL',
      incoterm: 'FOB',
      scope: 'Door to Door',
      displayOrigin: 'SIN',
      displayDestination: 'SYD',
      origin: 'SIN',
      destination: 'SYD',
      pol: 'SIN',
      pod: 'SYD',
      carrier: 'ONE',
      status: 'DRAFT',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      parties: {
        shipper: 'Singapore Export Ltd',
        consignee: 'Pacific Trading',
        notify: 'Australian Customs Broker'
      },
      locations: {
        pickupAddress: 'Jurong Industrial Estate, Singapore',
        deliveryAddress: '789 Commerce St, Sydney, Australia'
      },
      cargo: {
        description: 'Consumer Electronics',
        hsCode: '8528.72',
        packages: 480,
        weightKg: 12000,
        volumeM3: 38
      },
      dates: {
        readyDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        etdPreferred: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        etaPreferred: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      references: {
        customerRef: 'PT-SIN-2024-092',
        internalRef: 'INT-004'
      },
      notes: 'Weekly shipment - established customer',
      containers: {
        '20DC': 1,
        '40DC': 1,
        '40HC': 0
      },
      lines: [{
        idx: 0,
        rateId: 'R-ONE-SIN-SYD-20',
        vendor: 'ONE',
        carrier: 'ONE',
        lane: 'SIN → SYD',
        unit: '20DC',
        qty: 1,
        sell: 1800,
        discount: 0,
        margin: 300,
        ros: 16.7
      }, {
        idx: 1,
        rateId: 'R-ONE-SIN-SYD-40',
        vendor: 'ONE',
        carrier: 'ONE',
        lane: 'SIN → SYD',
        unit: '40DC',
        qty: 1,
        sell: 2400,
        discount: 100,
        margin: 400,
        ros: 16.7
      }],
      totals: {
        sell: 4200,
        margin: 700,
        ros: 16.7
      }
    },
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
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
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
        internalRef: 'INT-005'
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

// Seed demo bookings (FCL, LCL, Air) for a specific customer so Customer users see data
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
    // Create 3 demo bookings: FCL, LCL, and Air
    const demoBookings = [
      // FCL booking
      {
        id: `B-${code}-001`,
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
        parties: {
          shipper: name,
          consignee: `${name} Warehouse`,
          notify: `${name} Warehouse`
        },
        locations: {
          pickupAddress: 'Hong Kong Container Terminal',
          deliveryAddress: 'Customer warehouse, Los Angeles, CA'
        },
        cargo: {
          description: 'Consumer goods',
          hsCode: '6204.62',
          packages: 240,
          weightKg: 15000,
          volumeM3: 35
        },
        dates: {
          readyDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          etdPreferred: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          etaPreferred: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        references: {
          customerRef: `${code}-FCL-001`,
          internalRef: 'INT-DEMO-FCL'
        },
        notes: 'Demo FCL booking for customer',
        containers: {
          '20DC': 1,
          '40DC': 0,
          '40HC': 1
        },
        lines: [{
          idx: 0,
          rateId: 'R-DEMO-HKG-LAX-20',
          vendor: 'Evergreen',
          carrier: 'Evergreen',
          lane: 'HKG → LAX',
          unit: '20DC',
          qty: 1,
          sell: 1800,
          discount: 0,
          margin: 300,
          ros: 16.7
        }, {
          idx: 1,
          rateId: 'R-DEMO-HKG-LAX-40HC',
          vendor: 'Evergreen',
          carrier: 'Evergreen',
          lane: 'HKG → LAX',
          unit: '40HC',
          qty: 1,
          sell: 2200,
          discount: 0,
          margin: 400,
          ros: 18.2
        }],
        totals: { sell: 4000, margin: 700, ros: 17.5 }
      },
      // LCL booking
      {
        id: `B-${code}-002`,
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
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        parties: {
          shipper: `${name} Singapore`,
          consignee: name,
          notify: name
        },
        locations: {
          pickupAddress: 'Singapore Export Hub',
          deliveryAddress: 'Sydney Import Terminal'
        },
        cargo: {
          description: 'Textile products',
          hsCode: '6109.10',
          packages: 80,
          pallets: 4,
          weightKg: 3200,
          volumeM3: 12
        },
        dates: {
          readyDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          etdPreferred: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          etaPreferred: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        references: {
          customerRef: `${code}-LCL-002`,
          internalRef: 'INT-DEMO-LCL'
        },
        notes: 'Demo LCL booking for customer',
        lines: [{
          idx: 0,
          rateId: 'R-DEMO-SIN-SYD',
          vendor: 'ONE',
          carrier: 'ONE',
          lane: 'SIN → SYD',
          unit: 'CBM',
          qty: 12,
          sell: 85,
          discount: 5,
          margin: 15,
          ros: 17.6
        }],
        totals: { sell: 1020, margin: 180, ros: 17.6 }
      },
      // Air booking
      {
        id: `B-${code}-003`,
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
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        parties: {
          shipper: `${name} Thailand`,
          consignee: `${name} Europe`,
          notify: `${name} Europe`
        },
        locations: {
          pickupAddress: 'Suvarnabhumi Cargo Terminal, Bangkok',
          deliveryAddress: 'Frankfurt Cargo Terminal, Germany'
        },
        cargo: {
          description: 'Electronics components',
          hsCode: '8542.39',
          packages: 12,
          pieces: 48,
          weightKg: 320,
          volumeM3: 2.8
        },
        dates: {
          readyDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          etdPreferred: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          etaPreferred: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        references: {
          customerRef: `${code}-AIR-003`,
          internalRef: 'INT-DEMO-AIR'
        },
        notes: 'Demo Air booking for customer - urgent delivery',
        lines: [{
          idx: 0,
          rateId: 'R-DEMO-BKK-FRA',
          vendor: 'Lufthansa Cargo',
          carrier: 'Lufthansa Cargo',
          lane: 'BKK → FRA',
          unit: 'KG',
          qty: 320,
          sell: 5.20,
          discount: 0.20,
          margin: 0.80,
          ros: 15.4
        }],
        totals: { sell: 1664, margin: 256, ros: 15.4 }
      }
    ];

    const next = [...existing, ...demoBookings];
    localStorage.setItem('bookings', JSON.stringify(next));
    try {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('bookingsUpdated'));
    } catch (err) {
      console.warn('Could not dispatch events:', err);
    }
    return next;
  } catch (err) {
      console.warn('Error seeding customer demo booking:', err);
      return JSON.parse(localStorage.getItem('bookings') || '[]');
    }
}