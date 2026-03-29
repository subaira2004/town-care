'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import useSWR from 'swr';
import { Loader2, FileText, Download, Filter, DollarSign, Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { getAuthUser } from '@/app/actions/auth';

export default function PharmacyInvoicesPage() {
  const supabase = createClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const { data: invoices, isLoading: invoicesLoading } = useSWR(
    `pharmacy-invoices-${statusFilter}`,
    async () => {
      const user = await getAuthUser();
      if (!user) return [];

      const { data: pharmacy } = await supabase
        .from('pharmacies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!pharmacy) return [];

      let query = supabase
        .from('invoices')
        .select('*')
        .eq('pharmacy_id', pharmacy.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      return data || [];
    }
  );

  const { data: pharmacy } = useSWR(
    'current-pharmacy',
    async () => {
      const user = await getAuthUser();
      if (!user) return null;
      const { data } = await supabase.from('pharmacies').select('*').eq('user_id', user.id).single();
      return data;
    }
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle2 size={16} />;
      case 'pending': return <Clock size={16} />;
      case 'overdue': return <AlertCircle size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'var(--secondary)';
      case 'pending': return 'var(--warning)';
      case 'overdue': return 'var(--danger)';
      default: return 'var(--text-muted)';
    }
  };

  const totalPaid = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.amount || 0), 0) || 0;
  const totalPending = invoices?.filter(i => i.status === 'pending').reduce((sum, i) => sum + parseFloat(i.amount || 0), 0) || 0;

  if (invoicesLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <Loader2 className="animate-spin" color="var(--primary)" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 'var(--spacing-xl)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, color: 'var(--text-main)', marginBottom: 'var(--spacing-sm)' }}>
          Invoice History
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          View and download your subscription invoices
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
        <div className="card glass-panel" style={{ padding: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
            <CheckCircle2 size={20} color="var(--secondary)" />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Total Paid</span>
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--secondary)' }}>
            ₹{totalPaid.toLocaleString()}
          </div>
        </div>

        <div className="card glass-panel" style={{ padding: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
            <Clock size={20} color="var(--warning)" />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Pending</span>
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--warning)' }}>
            ₹{totalPending.toLocaleString()}
          </div>
        </div>

        <div className="card glass-panel" style={{ padding: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
            <FileText size={20} color="var(--primary)" />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Total Invoices</span>
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--text-main)' }}>
            {invoices?.length || 0}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card glass-panel" style={{ padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <Filter size={18} color="var(--text-muted)" />
          <select
            className="form-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ minWidth: '150px' }}
          >
            <option value="all">All Invoices</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Invoice List */}
      {invoices?.length === 0 ? (
        <div className="card glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <FileText size={48} color="var(--text-muted)" style={{ marginBottom: 'var(--spacing-md)' }} />
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-sm)' }}>No invoices found</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Invoices will appear here once your subscription is activated
          </p>
        </div>
      ) : (
        <div className="card glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: 'var(--spacing-md)' }}>Invoice #</th>
                <th style={{ padding: 'var(--spacing-md)' }}>Amount</th>
                <th style={{ padding: 'var(--spacing-md)' }}>Billing Period</th>
                <th style={{ padding: 'var(--spacing-md)' }}>Due Date</th>
                <th style={{ padding: 'var(--spacing-md)' }}>Status</th>
                <th style={{ padding: 'var(--spacing-md)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr key={invoice.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--spacing-md)' }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                      {invoice.invoice_number}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: 'var(--spacing-md)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      ₹{parseFloat(invoice.amount).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ padding: 'var(--spacing-md)' }}>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                      {new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: 'var(--spacing-md)' }}>
                    <div style={{ fontSize: 'var(--text-sm)', color: invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status !== 'paid' ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                    </div>
                  </td>
                  <td style={{ padding: 'var(--spacing-md)' }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: getStatusColor(invoice.status),
                        color: 'white',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      {getStatusIcon(invoice.status)}
                      {invoice.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--spacing-md)', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="btn btn-outline btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <FileText size={14} />
                        View
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={() => alert('PDF download coming soon!')}
                      >
                        <Download size={14} />
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setSelectedInvoice(null)}
              style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <AlertCircle size={24} />
            </button>

            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <FileText size={20} color="var(--primary)" />
              Invoice Details
            </h2>

            {/* Invoice Header */}
            <div style={{
              padding: 'var(--spacing-md)',
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--spacing-lg)',
              textAlign: 'center'
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-main)', marginBottom: 'var(--spacing-xs)' }}>
                {selectedInvoice.invoice_number}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>
                ₹{parseFloat(selectedInvoice.amount).toLocaleString()}
              </div>
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Pharmacy</div>
                <div style={{ fontWeight: 600 }}>{pharmacy?.name}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Status</div>
                <span className="badge" style={{
                  backgroundColor: getStatusColor(selectedInvoice.status),
                  color: 'white',
                  fontWeight: 600,
                  display: 'inline-block',
                  marginTop: 'var(--spacing-xs)'
                }}>
                  {selectedInvoice.status}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Period Start</div>
                <div>{new Date(selectedInvoice.period_start).toLocaleDateString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Period End</div>
                <div>{new Date(selectedInvoice.period_end).toLocaleDateString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Due Date</div>
                <div>{selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : '-'}</div>
              </div>
              {selectedInvoice.payment_date && (
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Paid On</div>
                  <div>{new Date(selectedInvoice.payment_date).toLocaleDateString()}</div>
                </div>
              )}
            </div>

            {selectedInvoice.notes && (
              <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--surface-hover)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-lg)'
              }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Notes</div>
                <div style={{ fontSize: 'var(--text-sm)' }}>{selectedInvoice.notes}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={() => alert('PDF download coming soon!')}
              >
                <Download size={18} />
                Download PDF
              </button>
              {selectedInvoice.status === 'pending' && (
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => alert('Please contact admin to mark payment as received')}
                >
                  <DollarSign size={18} style={{ marginRight: '0.25rem' }} />
                  Mark as Paid
                </button>
              )}
            </div>

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--spacing-md)' }}>
              For payment issues, please contact platform admin
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
