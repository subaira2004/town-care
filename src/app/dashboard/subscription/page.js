'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import useSWR from 'swr';
import { Loader2, CreditCard, CheckCircle2, AlertCircle, TrendingUp, Calendar, DollarSign, ArrowUpRight, Settings, FileText } from 'lucide-react';
import { getAuthUser } from '@/app/actions/auth';
import Link from 'next/link';

export default function PharmacySubscriptionPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [message, setMessage] = useState(null);

  // Fetch pharmacy subscription
  const { data: subscription, isLoading: subLoading, mutate } = useSWR(
    'pharmacy-subscription',
    async () => {
      const user = await getAuthUser();
      if (!user) return null;

      const { data } = await supabase
        .from('pharmacies')
        .select(`
          *,
          pharmacy_subscriptions (
            *,
            subscription_plans (*)
          )
        `)
        .eq('user_id', user.id)
        .single();

      return data?.pharmacy_subscriptions?.[0] || null;
    }
  );

  // Fetch available plans
  const { data: plans } = useSWR(
    'subscription-plans',
    async () => {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly');
      return data || [];
    }
  );

  // Fetch invoices
  const { data: invoices } = useSWR(
    'pharmacy-invoices',
    async () => {
      const user = await getAuthUser();
      if (!user) return [];

      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('pharmacy_id', subscription?.pharmacy_id)
        .order('created_at', { ascending: false })
        .limit(5);

      return data || [];
    },
    { fallbackData: [] }
  );

  const handleRequestUpgrade = async (planId) => {
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.from('subscription_change_requests').insert([{
        pharmacy_id: subscription.pharmacy_id,
        current_plan_id: subscription?.subscription_plans?.id,
        requested_plan_id: planId,
        request_type: 'upgrade',
        status: 'pending'
      }]);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Upgrade request sent! Admin will review your request.'
      });
      setShowUpgradeModal(false);
      mutate();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
    setLoading(false);
  };

  if (subLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <Loader2 className="animate-spin" color="var(--primary)" size={32} />
      </div>
    );
  }

  const plan = subscription?.subscription_plans;
  const usagePercent = plan?.max_tokens_per_month > 0
    ? Math.round((subscription?.tokens_used_this_month / plan.max_tokens_per_month) * 100)
    : 0;

  const isUnlimited = plan?.max_tokens_per_month === 0 || plan?.max_tokens_per_month === null;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 'var(--spacing-xl)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, color: 'var(--text-main)', marginBottom: 'var(--spacing-sm)' }}>
          Subscription & Billing
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          Manage your subscription plan and view invoices
        </p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem' }}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Current Plan Card */}
      <div className="card glass-panel" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'var(--spacing-sm)' }}>
              <div style={{ padding: 'var(--spacing-sm)', backgroundColor: 'var(--primary)15', borderRadius: 'var(--radius-md)' }}>
                <CreditCard size={24} color="var(--primary)" />
              </div>
              <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-main)' }}>
                  {plan?.name || 'No Subscription'}
                </h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  {plan?.description || 'Contact admin to activate subscription'}
                </p>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>
              ₹{plan?.price_monthly || 0}<span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 600 }}>/month</span>
            </div>
            {subscription?.current_period_end && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--spacing-xs)' }}>
                Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Usage Progress */}
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)' }}>
              Tokens Used This Month
            </span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-main)' }}>
              {subscription?.tokens_used_this_month || 0} / {isUnlimited ? '∞' : plan?.max_tokens_per_month}
            </span>
          </div>

          {isUnlimited ? (
            <div style={{
              padding: 'var(--spacing-md)',
              backgroundColor: 'var(--secondary)15',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <CheckCircle2 size={20} color="var(--secondary)" style={{ display: 'inline', marginBottom: 'var(--spacing-xs)' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--secondary)', marginLeft: 'var(--spacing-sm)' }}>
                Unlimited Tokens
              </span>
            </div>
          ) : (
            <>
              <div style={{ height: '12px', backgroundColor: 'var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${usagePercent}%`,
                    backgroundColor: usagePercent > 80 ? 'var(--danger)' : usagePercent > 50 ? 'var(--warning)' : 'var(--primary)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--spacing-xs)', textAlign: 'right' }}>
                {usagePercent}% used
              </div>
            </>
          )}
        </div>

        {/* Plan Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
          <FeatureItem
            icon={<TrendingUp size={18} />}
            label="Schedules"
            value={plan?.max_schedules || 0 === 0 ? '∞' : plan?.max_schedules}
          />
          <FeatureItem
            icon={<DollarSign size={18} />}
            label="Doctors"
            value={plan?.max_doctors || 0 === 0 ? '∞' : plan?.max_doctors}
          />
          <FeatureItem
            icon={<Calendar size={18} />}
            label="Status"
            value={subscription?.status || 'inactive'}
            capitalize
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          {!plan || plan.name === 'Free' ? (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="btn btn-primary"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ArrowUpRight size={18} />
              Upgrade Plan
            </button>
          ) : (
            <Link
              href="/dashboard/invoices"
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <FileText size={18} />
              View Invoices
            </Link>
          )}

          {subscription?.status === 'active' && (
            <button
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}
              onClick={async () => {
                if (!confirm('Are you sure you want to request cancellation?')) return;
                setLoading(true);
                await supabase.from('subscription_change_requests').insert([{
                  pharmacy_id: subscription.pharmacy_id,
                  request_type: 'cancel',
                  status: 'pending'
                }]);
                setLoading(false);
                setMessage({ type: 'success', text: 'Cancellation request sent!' });
                mutate();
              }}
              disabled={loading}
            >
              <AlertCircle size={18} />
              Request Cancellation
            </button>
          )}
        </div>
      </div>

      {/* Recent Invoices Preview */}
      {invoices?.length > 0 && (
        <div className="card glass-panel" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <FileText size={20} color="var(--primary)" />
              Recent Invoices
            </h3>
            <Link href="/dashboard/invoices" className="btn btn-outline btn-sm">
              View All
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>Invoice #</th>
                  <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>Amount</th>
                  <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>Period</th>
                  <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 3).map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 'var(--spacing-md)', fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}>{inv.invoice_number}</td>
                    <td style={{ padding: 'var(--spacing-md)', fontWeight: 700, color: 'var(--text-main)' }}>₹{parseFloat(inv.amount).toLocaleString()}</td>
                    <td style={{ padding: 'var(--spacing-md)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                      {new Date(inv.period_start).toLocaleDateString()} - {new Date(inv.period_end).toLocaleDateString()}
                    </td>
                    <td style={{ padding: 'var(--spacing-md)' }}>
                      <span className="badge" style={{
                        backgroundColor: inv.status === 'paid' ? 'var(--secondary)' : inv.status === 'pending' ? 'var(--warning)' : 'var(--danger)',
                        color: 'white',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600
                      }}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
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
          <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowUpgradeModal(false)}
              style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <AlertCircle size={24} />
            </button>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
              Choose a Plan
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>
              Select a plan and submit upgrade request. Admin will approve within 24 hours.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
              {plans?.filter(p => p.name !== 'Free').map(planOption => (
                <div
                  key={planOption.id}
                  className="card glass-panel"
                  style={{
                    padding: '1.5rem',
                    border: selectedPlan === planOption.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setSelectedPlan(planOption.id)}
                >
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{planOption.name}</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: '1rem' }}>{planOption.description}</p>

                  <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '1rem' }}>
                    ₹{planOption.price_monthly}<span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 600 }}>/mo</span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '1.5rem' }}>
                    <li style={{ fontSize: 'var(--text-sm)', marginBottom: '0.5rem' }}>
                      ✓ {planOption.max_tokens_per_month || '∞'} tokens/month
                    </li>
                    <li style={{ fontSize: 'var(--text-sm)', marginBottom: '0.5rem' }}>
                      ✓ {planOption.max_schedules || '∞'} schedules
                    </li>
                    <li style={{ fontSize: 'var(--text-sm)', marginBottom: '0.5rem' }}>
                      ✓ {planOption.max_doctors || '∞'} doctors
                    </li>
                  </ul>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleRequestUpgrade(planOption.id); }}
                    className="btn btn-primary"
                    disabled={loading || selectedPlan !== planOption.id}
                    style={{ width: '100%' }}
                  >
                    {selectedPlan === planOption.id ? (loading ? 'Requesting...' : 'Request Upgrade') : 'Select'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureItem({ icon, label, value, capitalize }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-sm)',
      padding: 'var(--spacing-md)',
      backgroundColor: 'var(--surface)',
      borderRadius: 'var(--radius-md)'
    }}>
      <div style={{ color: 'var(--primary)' }}>{icon}</div>
      <div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)', textTransform: capitalize ? 'capitalize' : 'none' }}>
          {value}
        </div>
      </div>
    </div>
  );
}
