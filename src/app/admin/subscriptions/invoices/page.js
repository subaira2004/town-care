'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import useSWR from 'swr';
import { Loader2, Search, FileText, Check, X, DollarSign, Calendar, Download, AlertCircle, Filter } from 'lucide-react';

export default function AdminInvoicesPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [message, setMessage] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const { data: invoices, isLoading: invoicesLoading, mutate } = useSWR(
    `admin-invoices-${statusFilter}-${searchQuery}`,
    async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          pharmacies (name, phone, town_name),
          pharmacy_subscriptions (
            subscription_plans (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchQuery) {
        query = query.or(`invoice_number.ilike.%${searchQuery}%,pharmacies.name.ilike.%${searchQuery}%`);
      }

      const { data } = await query;
      return data || [];
    }
  );

  const handleUpdateStatus = async (invoiceId, newStatus) => {
    setLoading(true);
    try {
      const updates = {
        status: newStatus,
        ...(newStatus === 'paid' ? {
          payment_date: new Date().toISOString().split('T')[0],
          paid_at: new Date().toISOString()
        } : {})
      };

      const { error } = await supabase.from('invoices').update(updates).eq('id', invoiceId);
      if (error) throw error;

      setMessage({ type: 'success', text: `Invoice marked as ${newStatus}!` });
      mutate();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
    setLoading(false);
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Invoice deleted successfully!' });
      mutate();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
    setLoading(false);
  };

  const getStatusBadgeClass = (status) => {
    const colors = {
      pending: 'var(--warning)',
      paid: 'var(--secondary)',
      overdue: 'var(--danger)',
      cancelled: 'var(--text-muted)'
    };
    return colors[status] || 'var(--text-muted)';
  };

  const totalRevenue = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.amount || 0), 0) || 0;
  const pendingAmount = invoices?.filter(i => i.status === 'pending').reduce((sum, i) => sum + parseFloat(i.amount || 0), 0) || 0;
  const overdueAmount = invoices?.filter(i => i.status === 'overdue').reduce((sum, i) => sum + parseFloat(i.amount || 0), 0) || 0;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem' }}>
            Invoice Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Track and manage pharmacy invoices
          </p>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem' }}>
          {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Revenue Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: 'var(--secondary)15', borderRadius: 'var(--radius-md)' }}>
              <DollarSign size={20} color="var(--secondary)" />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total Revenue</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--secondary)' }}>
            ₹{totalRevenue.toLocaleString()}
          </div>
        </div>

        <div className="card glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: 'var(--warning)15', borderRadius: 'var(--radius-md)' }}>
              <Calendar size={20} color="var(--warning)" />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Pending</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--warning)' }}>
            ₹{pendingAmount.toLocaleString()}
          </div>
        </div>

        <div className="card glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: 'var(--danger)15', borderRadius: 'var(--radius-md)' }}>
              <AlertCircle size={20} color="var(--danger)" />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Overdue</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--danger)' }}>
            ₹{overdueAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '3rem' }}
            placeholder="Search by invoice number or pharmacy..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Filter size={18} color="var(--text-muted)" />
          <select
            className="form-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ minWidth: '150px' }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoice List */}
      {invoicesLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" color="var(--primary)" size={32} />
        </div>
      ) : invoices.length === 0 ? (
        <div className="card glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <FileText size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No invoices found</p>
        </div>
      ) : (
        <div className="card glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '1rem' }}>Invoice #</th>
                <th style={{ padding: '1rem' }}>Pharmacy</th>
                <th style={{ padding: '1rem' }}>Amount</th>
                <th style={{ padding: '1rem' }}>Period</th>
                <th style={{ padding: '1rem' }}>Due Date</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr key={invoice.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '600', fontFamily: 'monospace' }}>{invoice.invoice_number}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '600' }}>{invoice.pharmacies?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{invoice.pharmacies?.town_name}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>
                      ₹{parseFloat(invoice.amount).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem' }}>
                      {new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem' }}>
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: getStatusBadgeClass(invoice.status),
                        color: 'white',
                        fontWeight: '600'
                      }}
                    >
                      {invoice.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {invoice.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(invoice.id, 'paid')}
                          className="btn btn-secondary btn-sm"
                          disabled={loading}
                          title="Mark as Paid"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      {invoice.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(invoice.id, 'overdue')}
                          className="btn btn-outline btn-sm"
                          disabled={loading}
                          title="Mark as Overdue"
                        >
                          <AlertCircle size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="btn btn-outline btn-sm"
                        title="View Details"
                      >
                        <FileText size={14} />
                      </button>
                      {invoice.status === 'pending' && (
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--danger)' }}
                          disabled={loading}
                          title="Delete"
                        >
                          <X size={14} />
                        </button>
                      )}
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
              <X size={24} />
            </button>

            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="var(--primary)" />
              Invoice Details
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Invoice Number</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.125rem', fontWeight: '700' }}>{selectedInvoice.invoice_number}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Pharmacy</div>
                  <div style={{ fontWeight: '600' }}>{selectedInvoice.pharmacies?.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Amount</div>
                  <div style={{ fontWeight: '700', color: 'var(--primary)' }}>₹{parseFloat(selectedInvoice.amount).toLocaleString()}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Period Start</div>
                  <div>{new Date(selectedInvoice.period_start).toLocaleDateString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Period End</div>
                  <div>{new Date(selectedInvoice.period_end).toLocaleDateString()}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Due Date</div>
                  <div>{selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Status</div>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: getStatusBadgeClass(selectedInvoice.status),
                      color: 'white',
                      fontWeight: '600',
                      display: 'inline-block',
                      marginTop: '0.25rem'
                    }}
                  >
                    {selectedInvoice.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Notes</div>
                  <div style={{ fontSize: '0.875rem' }}>{selectedInvoice.notes}</div>
                </div>
              )}

              {selectedInvoice.payment_method && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Payment Method</div>
                  <div style={{ fontSize: '0.875rem', textTransform: 'capitalize' }}>{selectedInvoice.payment_method.replace('_', ' ')}</div>
                </div>
              )}

              {selectedInvoice.payment_date && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Payment Date</div>
                  <div>{new Date(selectedInvoice.payment_date).toLocaleDateString()}</div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }}>
                <Download size={16} style={{ marginRight: '0.5rem' }} />
                Download PDF
              </button>
              {selectedInvoice.status === 'pending' && (
                <button
                  onClick={() => handleUpdateStatus(selectedInvoice.id, 'paid')}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  <Check size={16} style={{ marginRight: '0.5rem' }} />
                  Mark as Paid
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
