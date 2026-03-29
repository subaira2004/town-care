'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Check, AlertCircle, DollarSign, Users, Calendar, Settings } from 'lucide-react';

export default function AdminSubscriptionPlansNewPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

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
      const { error } = await supabase.from('subscription_plans').insert([planData]);
      if (error) throw error;

      setMessage({ type: 'success', text: 'Plan created successfully!' });

      // Redirect after short delay
      setTimeout(() => {
        router.push('/admin/subscriptions/plans');
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in">
      {/* Header with Back Button */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => router.back()}
          className="btn btn-outline btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}
        >
          <ArrowLeft size={16} />
          Back to Plans
        </button>

        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem' }}>
          Create New Subscription Plan
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Define a new subscription tier for pharmacies
        </p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem' }}>
          {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Form Card */}
      <div className="card glass-panel" style={{ padding: '2rem', maxWidth: '800px' }}>
        <form onSubmit={handleSavePlan}>
          {/* Basic Information Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={20} color="var(--primary)" />
              Basic Information
            </h2>

            <div className="form-group">
              <label className="form-label">Plan Name *</label>
              <input
                name="name"
                type="text"
                className="form-input"
                required
                placeholder="e.g., Basic, Pro, Enterprise"
                style={{ fontSize: '1.125rem', fontWeight: '600' }}
              />
              <p className="form-hint">This will be displayed to pharmacies</p>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                className="form-input"
                rows={3}
                placeholder="Brief description of this plan and who it's for..."
              />
            </div>
          </div>

          {/* Pricing Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={20} color="var(--secondary)" />
              Pricing
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Monthly Price (₹) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    fontWeight: '600'
                  }}>₹</span>
                  <input
                    name="price_monthly"
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    defaultValue="0"
                    style={{ paddingLeft: '2.5rem', fontSize: '1.25rem', fontWeight: '700' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Yearly Price (₹) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    fontWeight: '600'
                  }}>₹</span>
                  <input
                    name="price_yearly"
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    defaultValue="0"
                    style={{ paddingLeft: '2.5rem', fontSize: '1.25rem', fontWeight: '700' }}
                    required
                  />
                </div>
                <p className="form-hint">Suggested: Monthly × 10 (2 months free)</p>
              </div>
            </div>
          </div>

          {/* Usage Limits Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} color="var(--primary)" />
              Usage Limits
            </h2>

            <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Set limits to 0 for unlimited access
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} color="var(--text-muted)" />
                    Tokens per Month
                  </label>
                  <input
                    name="max_tokens_per_month"
                    type="number"
                    min="0"
                    className="form-input"
                    defaultValue="100"
                    style={{ fontSize: '1.125rem', fontWeight: '600' }}
                  />
                  <p className="form-hint">0 = Unlimited</p>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Settings size={16} color="var(--text-muted)" />
                    Max Schedules
                  </label>
                  <input
                    name="max_schedules"
                    type="number"
                    min="0"
                    className="form-input"
                    defaultValue="10"
                    style={{ fontSize: '1.125rem', fontWeight: '600' }}
                  />
                  <p className="form-hint">0 = Unlimited</p>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={16} color="var(--text-muted)" />
                    Max Doctors
                  </label>
                  <input
                    name="max_doctors"
                    type="number"
                    min="0"
                    className="form-input"
                    defaultValue="5"
                    style={{ fontSize: '1.125rem', fontWeight: '600' }}
                  />
                  <p className="form-hint">0 = Unlimited</p>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={20} color="var(--secondary)" />
              Features
            </h2>

            <div className="form-group">
              <label className="form-label">Features (comma-separated)</label>
              <input
                name="features"
                type="text"
                className="form-input"
                placeholder="basic_queue, analytics, whatsapp_sharing, tamil_language"
                style={{ fontFamily: 'monospace' }}
              />
              <p className="form-hint">Enter feature names separated by commas. These will be displayed on the plan card.</p>
            </div>

            {/* Common Features Reference */}
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--surface-hover)',
              borderRadius: 'var(--radius-md)',
              marginTop: '1rem'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>COMMON FEATURES:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {['basic_queue', 'patient_registry', 'whatsapp_sharing', 'analytics_basic', 'analytics_advanced', 'payment_tracking', 'tamil_language', 'priority_support', 'custom_reports', 'export_data'].map(feature => (
                  <span
                    key={feature}
                    className="badge"
                    style={{ backgroundColor: 'var(--surface)', fontSize: '0.65rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                    onClick={() => {
                      const input = document.querySelector('input[name="features"]');
                      if (input) {
                        input.value = input.value ? `${input.value}, ${feature}` : feature;
                      }
                    }}
                  >
                    + {feature.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Plan Status Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={20} color="var(--text-muted)" />
              Plan Status
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label className="payment-toggle" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                padding: '1rem',
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}>
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked
                  style={{ width: '20px', height: '20px' }}
                />
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Active Plan</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pharmacies can subscribe to this plan</div>
                </div>
              </label>

              <label className="payment-toggle" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                padding: '1rem',
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}>
                <input
                  type="checkbox"
                  name="is_default"
                  style={{ width: '20px', height: '20px' }}
                />
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Default for New Pharmacies</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Automatically assigned on signup</div>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border)',
            position: 'sticky',
            bottom: 0,
            backgroundColor: 'var(--background)',
            zIndex: 10
          }}>
            <button
              type="button"
              onClick={() => router.back()}
              className="btn btn-outline"
              disabled={loading}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Creating Plan...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Create Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="card glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem', maxWidth: '800px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-main)' }}>
          💡 Tips for Creating Plans
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          <li>Use clear, descriptive names that pharmacies will understand (e.g., "Starter", "Growth", "Enterprise")</li>
          <li>Set yearly pricing at 10× monthly to encourage annual subscriptions (2 months free)</li>
          <li>Free tier should have limited tokens to allow testing but encourage upgrade</li>
          <li>Pro/Enterprise plans should have unlimited or very high limits</li>
          <li>Features should match the target audience (basic for small pharmacies, advanced for busy ones)</li>
          <li>Only one plan should be marked as "Default" - this is assigned to new pharmacies</li>
        </ul>
      </div>
    </div>
  );
}
