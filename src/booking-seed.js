// Sample booking seeder for testing shipping instruction workflow
export function seedSampleBookings() {
  const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  
  // Only seed if no bookings exist
  if (bookings.length > 0) {
    console.log('Bookings already exist, skipping seed');
    return;
  }

  const sampleBookings = [
    {
      id: 'B-DEMO-001',
      quotationId: 'Q-DEMO-001',
      customer: 'ACME Corp',
      customerName: 'ACME Corp',
      mode: 'Ocean',
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
        weightKg: 8000,
        volumeM3: 25
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
      lines: [{
        idx: 0,
        rateId: 'R-EVG-HKG-LAX',
        vendor: 'Evergreen',
        carrier: 'Evergreen',
        lane: 'HKG → LAX',
        unit: '40HC',
        qty: 1,
        sell: 1800,
        discount: 100,
        margin: 300,
        ros: 17.6
      }],
      totals: {
        sell: 1700,
        margin: 300,
        ros: 17.6
      }
    }
  ];

  // Save to localStorage
  localStorage.setItem('bookings', JSON.stringify(sampleBookings));
  
  // Dispatch events to notify components
  try {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('bookingsUpdated'));
  } catch (err) {
    console.warn('Could not dispatch events:', err);
  }

  console.log('Sample bookings seeded:', sampleBookings.length);
  return sampleBookings;
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