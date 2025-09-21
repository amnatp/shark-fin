import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

// Mock auth-context to return a stable Customer user
const mockAuth = { user: { username: 'cust.john', role: 'Customer' } };
vi.mock('../auth-context', () => ({ useAuth: () => mockAuth }));

// Mock use-settings to provide a stable settings object
const mockSettings = { settings: { rosBands: [], autoApproveMin: 15, minRosGuardrail: {} } };
vi.mock('../use-settings', () => ({ useSettings: () => mockSettings }));

// Mock sales-docs persistence functions used by the component
vi.mock('../sales-docs', () => ({
  loadQuotations: () => [ { id: 'Q-1', quotationNo: 'Q-1', status: 'draft', lines: [], charges: [], inquiryId: 'I-1', customer: 'ACME' } ],
  saveQuotations: () => {},
  loadInquiries: () => [],
  saveInquiries: () => {},
  generateQuotationNo: () => 'Q-TEST'
}));

// Because QuotationEdit uses react-router hooks, provide a minimal wrapper
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import QuotationEdit from '../quotation-edit';

describe('QuotationEdit customer read-only', ()=>{
  test('customer cannot see save/button actions and status buttons are disabled', async ()=>{
    render(
      <MemoryRouter initialEntries={["/quotations/Q-1"]}>
        <Routes>
          <Route path="/quotations/:id" element={<QuotationEdit/>} />
        </Routes>
      </MemoryRouter>
    );

    // Save button should not be present for Customer
    const save = screen.queryByRole('button', { name: /save/i });
    expect(save).toBeNull();

    // Use Template button should not be present
    const tpl = screen.queryByRole('button', { name: /use template/i });
    expect(tpl).toBeNull();

    // Status flow buttons should exist but be disabled
    const statusButtons = await screen.findAllByRole('button', { name: /submit|approve|reject/i });
    expect(statusButtons.length).toBeGreaterThan(0);
  statusButtons.forEach(b => expect(b.disabled).toBe(true));
  });
});
