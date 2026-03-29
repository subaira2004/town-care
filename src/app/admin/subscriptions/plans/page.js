'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import useSWR from 'swr';
import { Loader2, Plus, Edit2, Trash2, Check, X, DollarSign, Users, Calendar, Settings, AlertCircle } from 'lucide-react';

export default function AdminSubscriptionPlansPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState(null);

  const { data: plans, isLoading: plansLoading, mutate } = useSWR(
    'admin-subscription-plans',
    async () => {
      const { data } = await supabase.from('subscription_plans').select('*').order('price_monthly', { ascending: true });
      return data || [];
    }
  );

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.target);
    const planData = {
      name: formData.get('name'),
      description: formData.get('description'),
      price_monthly: formData.get('price_monthly') || 0,
      price_yearly: formData.get('price_yearly') || 0,
      max_tokens_per_month: formData.get('max_tokens_per_month') || 0,
      max_schedules: formData.get('max_schedules') || 0,
      max_doctors: formData.get('max_doctors') || 0,
      is_active: formData.get('is_active') === 'on',
      is_default: formData.get('is_default') === 'on'
    };

    // Features as JSON
    const featuresStr = formData.get('features') || '';
    const features = featuresStr.split(',').map(f => f.trim()).filter(f => f);
    planData.features = features;

    try {
      if (editingPlan) {
        const { error } = await supabase.from('subscription_plans').update(planData).eq('id', editingPlan.id);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Plan updated successfully!' });
      } else {
        const { error } = await supabase.from('subscription_plans').insert([planData]);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Plan created successfully!' });
      }
      mutate();
      setShowForm(false);
      setEditingPlan(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
    setLoading(false);
  };

  const handleDeletePlan = async (id) => {
    if (!confirm('Are you sure? This will affect all pharmacies on this plan.')) return;
    setLoading(true);
    const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Plan deleted successfully!' });
      mutate();
    }
    setLoading(false);
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingPlan(null);
    setShowForm(true);
  };

  if (plansLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <Loader2 className="animate-spin" color="var(--primary)" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem' }}>
            Subscription Plans
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Manage plan tiers and pricing for pharmacies
          </p>
        </div>
        <button onClick={handleNew} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} />
          New Plan
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem' }}>
          {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Plans Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="card glass-panel"
            style={{
              padding: '1.5rem',
              border: plan.is_default ? '2px solid var(--primary)' : '1px solid var(--border)',
              position: 'relative'
            }}
          >
            {plan.is_default && (
              <span style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                backgroundColor: 'var(--primary)',
                color: 'white',
                fontSize: '0.7rem',
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '700'
              }}>
                DEFAULT
              </span>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                {plan.name}
              </h3>
              {plan.description && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {plan.description}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)' }}>
                  ₹{plan.price_monthly}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>/month</span>
              </div>
              {plan.price_yearly > 0 && (
                <div style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>
                  ₹{plan.price_yearly}/year (Save ₹{plan.price_monthly * 12 - plan.price_yearly})
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Limits
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tokens/month:</span>
                  <span style={{ fontWeight: '600' }}>{plan.max_tokens_per_month || 'Unlimited'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Schedules:</span>
                  <span style={{ fontWeight: '600' }}>{plan.max_schedules || 'Unlimited'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Doctors:</span>
                  <span style={{ fontWeight: '600' }}>{plan.max_doctors || 'Unlimited'}</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Features
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(plan.features || []).map((feature, idx) => (
                  <span
                    key={idx}
                    className="badge"
                    style={{ backgroundColor: 'var(--surface)', fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                  >
                    {feature.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => handleEdit(plan)}
                className="btn btn-outline btn-sm"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
              >
                <Edit2 size={14} /> Edit
              </button>
              <button
                onClick={() => handleDeletePlan(plan.id)}
                className="btn btn-outline btn-sm"
                disabled={!plan.is_active}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', color: 'var(--danger)' }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>

            {!plan.is_active && (
              <div style={{
                marginTop: '1rem',
                padding: '0.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
                color: 'var(--danger)',
                textAlign: 'center',
                fontWeight: '600'
              }}>
                Inactive Plan
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
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
          <div className="card" style={{
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '2rem',
            position: 'relative'
          }}>
            <button
              onClick={() => { setShowForm(false); setEditingPlan(null); }}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '1rem',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>

            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </h2>

            <form onSubmit={handleSavePlan}>
              <div className="form-group">
                <label className="form-label">Plan Name *</label>
                <input
                  name="name"
                  type="text"
                  className="form-input"
                  defaultValue={editingPlan?.name || ''}
                  required
                  placeholder="e.g., Basic, Pro, Enterprise"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-input"
                  defaultValue={editingPlan?.description || ''}
                  rows={2}
                  placeholder="Brief description of this plan"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Monthly Price (₹)</label>
                  <input
                    name="price_monthly"
                    type="number"
                    min="0"
                    className="form-input"
                    defaultValue={editingPlan?.price_monthly || 0}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Yearly Price (₹)</label>
                  <input
                    name="price_yearly"
                    type="number"
                    min="0"
                    className="form-input"
                    defaultValue={editingPlan?.price_yearly || 0}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Usage Limits (0 = Unlimited)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Tokens/Month</label>
                    <input
                      name="max_tokens_per_month"
                      type="number"
                      min="0"
                      className="form-input"
                      defaultValue={editingPlan?.max_tokens_per_month || 100}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Schedules</label>
                    <input
                      name="max_schedules"
                      type="number"
                      min="0"
                      className="form-input"
                      defaultValue={editingPlan?.max_schedules || 10}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Doctors</label>
                    <input
                      name="max_doctors"
                      type="number"
                      min="0"
                      className="form-input"
                      defaultValue={editingPlan?.max_doctors || 5}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Features (comma-separated)</label>
                <input
                  name="features"
                  type="text"
                  className="form-input"
                  defaultValue={(editingPlan?.features || []).join(', ')}
                  placeholder="basic_queue, analytics, whatsapp_sharing"
                />
                <p className="form-hint">Enter feature names separated by commas</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <label className="payment-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={editingPlan?.is_active !== false}
                  />
                  <span>Active Plan</span>
                </label>

                <label className="payment-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="is_default"
                    defaultChecked={editingPlan?.is_default || false}
                  />
                  <span>Default for New Pharmacies</span>
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (editingPlan ? 'Update Plan' : 'Create Plan')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
