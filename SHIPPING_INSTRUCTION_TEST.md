# Shipping Instruction Workflow Test Plan

This document outlines how to test the complete shipping instruction workflow for both Customer and CustomerService users.

## Prerequisites
1. Start the development server: `npm run dev`
2. Open browser to the displayed URL (usually http://localhost:5174)

## Test Scenarios

### Scenario 1: Customer User Workflow
1. **Login as Customer**
   - Navigate to login page
   - Use credentials: `customer.ace` / `password123`
   
2. **Seed Sample Data (Development Only)**
   - Navigate to "Bookings" from the menu
   - Click "Seed Sample Data" button (only visible in development)
   - Verify that 3 sample bookings appear in the list
   
3. **Navigate to Bookings**
   - Should see "My Bookings" in the page title
   - Should only see bookings for the logged-in customer
   
4. **Create Shipping Instruction**
   - Click the document icon (📄) next to any booking
   - Should navigate to `/shipping-instruction/{bookingId}`
   - Form should be pre-filled with booking data:
     * Booking ID in the header
     * Shipper name from booking
     * Transportation details (mode, carrier, POL/POD)
     * Basic commodity information
   
5. **Complete Shipping Instruction**
   - Fill in required fields:
     * Shipper address
     * Consignee details
     * Commodity descriptions
   - Add additional commodity lines if needed
   - Fill authorization section
   
6. **Save Options**
   - Test "Save Draft" - should save and show success message
   - Test "Mark Ready for BL" - should validate required fields
   - If validation fails, should show missing field error
   
7. **BL Preview**
   - Click "BL Preview" button
   - Should open dialog with formatted summary
   - Should show parties, transportation, and cargo details
   - Close dialog

### Scenario 2: CustomerService User Workflow
1. **Login as CustomerService**
   - Use credentials: `customerservice.kim` / `password123`
   
2. **Navigate to Bookings**
   - Should see "Bookings" in the page title (not "My Bookings")
   - Should see bookings from ALL customers
   
3. **Create Shipping Instruction**
   - Select any booking from any customer
   - Click the document icon
   - Should be able to create shipping instructions for any customer's booking
   
4. **Complete Same Workflow**
   - Same steps as Customer workflow
   - Should have access to all functionality

### Scenario 3: Data Persistence Testing
1. **Create Multiple Instructions**
   - Create shipping instructions from different bookings
   - Save some as "Draft" and others as "Ready for BL"
   
2. **Verify Storage**
   - Open browser DevTools → Application → Local Storage
   - Check for `shippingInstructions` key
   - Should contain array of saved instructions
   
3. **Navigation Testing**
   - Navigate away and back to shipping instruction
   - Should reload with saved data
   - Status should be preserved

## Expected Results

### Form Pre-filling
- ✅ Booking ID displays in header
- ✅ Shipper name from booking customer
- ✅ Transportation mode, carrier, POL/POD
- ✅ Reference number from booking

### Validation
- ✅ "Save Draft" works without validation
- ✅ "Mark Ready for BL" validates required fields:
  - Shipper name
  - Port of Loading
  - Port of Discharge
  - At least one commodity with description

### BL Preview
- ✅ Shows formatted summary
- ✅ Displays parties correctly
- ✅ Shows transportation details
- ✅ Lists commodities with totals

### Role-based Access
- ✅ Customer sees only their bookings
- ✅ CustomerService sees all bookings
- ✅ Both can create shipping instructions
- ✅ Both have same form functionality

## Troubleshooting

### No Bookings Visible
- Make sure you've clicked "Seed Sample Data"
- Check that you're logged in with correct role
- CustomerService should see all bookings
- Customer should see filtered bookings

### Form Not Pre-filling
- Verify booking ID in URL matches existing booking
- Check browser console for errors
- Ensure booking has required fields (customer, mode, etc.)

### Save Not Working
- Check browser console for errors
- Verify localStorage is enabled
- Try clearing localStorage and reseeding data

### Navigation Issues
- Ensure you're clicking the document icon (not the eye icon)
- Check that route `/shipping-instruction/:bookingId` is properly configured
- Verify user has required role permissions