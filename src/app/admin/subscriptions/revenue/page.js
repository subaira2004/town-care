'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import useSWR from 'swr';
import { Loader2, TrendingUp, DollarSign, Building2, Users, Calendar, ArrowUpRight, ArrowDownRight, PieChart, BarChart3 } from 'lucide-react';

export default function AdminRevenueDashboardPage() {
  const supabase = createClient();
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Fetch revenue stats
  const { data: revenueStats, isLoading: revenueLoading } = useSWR(
    `admin-revenue-stats-${selectedPeriod}`,
    async () => {
      const now = new Date();
      let startDate = new Date();

      if (selectedPeriod === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (selectedPeriod === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (selectedPeriod === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
      } else {
        startDate = new Date(0); // All time
      }

      // Get all invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, status, created_at, period_start')
        .gte('created_at', startDate.toISOString());

      const totalRevenue = invoices
        ?.filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0) || 0;

      const pendingRevenue = invoices
        ?.filter(i => i.status === 'pending')
        .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0) || 0;

      const overdueRevenue = invoices
        ?.filter(i => i.status === 'overdue')
        .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0) || 0;

      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - (now - startDate));

      const { data: previousInvoices } = await supabase
        .from('invoices')
        .select('amount, status')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      const previousRevenue = previousInvoices
        ?.filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0) || 0;

      const growth = previousRevenue > 0
        ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100)
        : 0;

      // MRR (Monthly Recurring Revenue)
      const { data: activeSubs } = await supabase
        .from('pharmacy_subscriptions')
        .select(`
          *,
          subscription_plans (price_monthly)
        `)
        .eq('status', 'active');

      const mrr = activeSubs?.reduce((sum, sub) => {
        const planPrice = parseFloat(sub.subscription_plans?.price_monthly || 0);
        return sum + planPrice;
      }, 0) || 0;

      return {
        totalRevenue,
        pendingRevenue,
        overdueRevenue,
        growth,
        mrr,
        invoiceCount: invoices?.length || 0,
        paidInvoiceCount: invoices?.filter(i => i.status === 'paid').length || 0
      };
    }
  );

  // Fetch plan distribution
  const { data: planDistribution, isLoading: planLoading } = useSWR(
    'admin-plan-distribution',
    async () => {
      const { data: subs } = await supabase
        .from('pharmacy_subscriptions')
        .select(`
          *,
          subscription_plans (name, price_monthly)
        `)
        .eq('status', 'active');

      const distribution = {};
      subs?.forEach(sub => {
        const planName = sub.subscription_plans?.name || 'Unknown';
        if (!distribution[planName]) {
          distribution[planName] = {
            count: 0,
            revenue: 0,
            price: parseFloat(sub.subscription_plans?.price_monthly || 0)
          };
        }
        distribution[planName].count++;
        distribution[planName].revenue += parseFloat(sub.subscription_plans?.price_monthly || 0);
      });

      return Object.entries(distribution).map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.revenue,
        price: data.price
      })).sort((a, b) => b.count - a.count);
    }
  );

  // Fetch top paying pharmacies
  const { data: topPharmacies, isLoading: pharmaciesLoading } = useSWR(
    'admin-top-pharmacies',
    async () => {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('pharmacy_id, amount, status')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(100);

      const pharmacyRevenue = {};
      invoices?.forEach(inv => {
        if (!pharmacyRevenue[inv.pharmacy_id]) {
          pharmacyRevenue[inv.pharmacy_id] = 0;
        }
        pharmacyRevenue[inv.pharmacy_id] += parseFloat(inv.amount || 0);
      });

      const { data: pharmacies } = await supabase
        .from('pharmacies')
        .select('id, name, town_name')
        .in('id', Object.keys(pharmacyRevenue));

      return pharmacies?.map(pharm => ({
        ...pharm,
        revenue: pharmacyRevenue[pharm.id]
      })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    }
  );

  // Fetch recent activity
  const { data: recentActivity, isLoading: activityLoading } = useSWR(
    'admin-recent-activity',
    async () => {
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          *,
          pharmacies (name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      return invoices || [];
    }
  );

  const isLoading = revenueLoading || planLoading || pharmaciesLoading || activityLoading;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem' }}>
            Revenue Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Monitor platform revenue and subscription performance
          </p>
        </div>

        {/* Period Selector */}
        <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--surface-hover)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
          {['week', 'month', 'year', 'all'].map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`btn btn-sm ${selectedPeriod === period ? 'btn-primary' : ''}`}
              style={{ border: 'none' }}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" color="var(--primary)" size={32} />
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <MetricCard
              icon={<DollarSign size={24} color="var(--secondary)" />}
              label="Total Revenue"
              value={`₹${(revenueStats?.totalRevenue || 0).toLocaleString()}`}
              trend={revenueStats?.growth || 0}
              color="var(--secondary)"
            />

            <MetricCard
              icon={<TrendingUp size={24} color="var(--primary)" />}
              label="MRR"
              value={`₹${(revenueStats?.mrr || 0).toLocaleString()}`}
              subValue="Monthly Recurring"
              color="var(--primary)"
            />

            <MetricCard
              icon={<Calendar size={24} color="var(--warning)" />}
              label="Pending"
              value={`₹${(revenueStats?.pendingRevenue || 0).toLocaleString()}`}
              subValue={`${revenueStats?.invoiceCount || 0} invoices`}
              color="var(--warning)"
            />

            <MetricCard
              icon={<Building2 size={24} color="var(--secondary)" />}
              label="Paid Invoices"
              value={revenueStats?.paidInvoiceCount || 0}
              subValue={`of ${revenueStats?.invoiceCount || 0} total`}
              color="var(--secondary)"
            />
          </div>

          {/* Plan Distribution */}
          <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <PieChart size={20} color="var(--primary)" />
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)' }}>
                Subscription Plan Distribution
              </h2>
            </div>

            {planDistribution?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                No active subscriptions
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {planDistribution?.map((plan, idx) => {
                  const totalSubs = planDistribution.reduce((sum, p) => sum + p.count, 0);
                  const percentage = totalSubs > 0 ? Math.round((plan.count / totalSubs) * 100) : 0;

                  return (
                    <div
                      key={plan.name}
                      style={{
                        padding: '1.5rem',
                        backgroundColor: 'var(--surface)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: idx === 0 ? 'var(--primary)' : idx === 1 ? 'var(--secondary)' : 'var(--warning)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '900',
                          fontSize: '1.25rem'
                        }}>
                          {idx + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '1rem' }}>{plan.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{plan.price}/month</div>
                        </div>
                      </div>

                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-main)' }}>
                          {plan.count}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {percentage}% of subscriptions
                        </div>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>
                        ₹{plan.revenue.toLocaleString()}/month revenue
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Two Column Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            {/* Top Paying Pharmacies */}
            <div className="card glass-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <BarChart3 size={20} color="var(--primary)" />
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)' }}>
                  Top Paying Pharmacies
                </h2>
              </div>

              {topPharmacies?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                  No payment data yet
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {topPharmacies?.map((pharm, idx) => (
                    <div
                      key={pharm.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.75rem',
                        backgroundColor: 'var(--surface)',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : 'var(--surface-hover)',
                        color: idx < 3 ? 'white' : 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '900',
                        fontSize: '0.875rem'
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{pharm.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pharm.town_name}</div>
                      </div>
                      <div style={{ fontWeight: '700', color: 'var(--secondary)', fontSize: '0.875rem' }}>
                        ₹{pharm.revenue.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="card glass-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Calendar size={20} color="var(--primary)" />
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)' }}>
                  Recent Invoices
                </h2>
              </div>

              {recentActivity?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                  No recent invoices
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {recentActivity?.map(invoice => (
                    <div
                      key={invoice.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        backgroundColor: 'var(--surface)',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                          {invoice.invoice_number}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {invoice.pharmacies?.name}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.875rem' }}>
                          ₹{parseFloat(invoice.amount).toLocaleString()}
                        </div>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: invoice.status === 'paid' ? 'var(--secondary)' : invoice.status === 'pending' ? 'var(--warning)' : 'var(--danger)',
                            fontSize: '0.65rem',
                            padding: '0.2rem 0.4rem',
                            marginTop: '0.25rem'
                          }}
                        >
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, trend, subValue, color }) {
  return (
    <div className="card glass-panel" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ padding: '0.75rem', backgroundColor: `${color}15`, borderRadius: 'var(--radius-md)' }}>
          {icon}
        </div>
        {trend !== undefined && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.875rem',
            fontWeight: '700',
            color: trend >= 0 ? 'var(--secondary)' : 'var(--danger)'
          }}>
            {trend >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.5rem' }}>
        {label}
      </div>

      <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {value}
      </div>

      {subValue && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
          {subValue}
        </div>
      )}
    </div>
  );
}
