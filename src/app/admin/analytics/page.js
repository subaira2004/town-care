'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import useSWR from 'swr';
import { Loader2, TrendingUp, Building2, Users, Activity, IndianRupee, MapPin, Star, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminAnalyticsPage() {
  const supabase = createClient();
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Fetch platform health stats
  const { data: platformStats, isLoading: platformLoading } = useSWR(
    'admin-platform-stats',
    async () => {
      // Total pharmacies
      const { count: totalPharmacies } = await supabase
        .from('pharmacies')
        .select('*', { count: 'exact', head: true });

      // Active pharmacies (approved)
      const { count: activePharmacies } = await supabase
        .from('pharmacies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Total doctors
      const { count: totalDoctors } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true });

      // Total patients
      const { count: totalPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // Today's tokens
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySchedules } = await supabase
        .from('schedules')
        .select('id')
        .eq('schedule_date', today);

      let todayTokens = 0;
      if (todaySchedules && todaySchedules.length > 0) {
        const scheduleIds = todaySchedules.map(s => s.id);
        const { count } = await supabase
          .from('tokens')
          .select('*', { count: 'exact', head: true })
          .in('schedule_id', scheduleIds);
        todayTokens = count || 0;
      }

      // Pending approvals
      const { count: pendingApprovals } = await supabase
        .from('pharmacies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return {
        totalPharmacies: totalPharmacies || 0,
        activePharmacies: activePharmacies || 0,
        totalDoctors: totalDoctors || 0,
        totalPatients: totalPatients || 0,
        todayTokens,
        pendingApprovals: pendingApprovals || 0
      };
    }
  );

  // Fetch pharmacy performance ranking
  const { data: pharmacyRanking, isLoading: rankingLoading } = useSWR(
    'admin-pharmacy-ranking',
    async () => {
      const { data: pharmacies } = await supabase
        .from('pharmacies')
        .select('id, name, town_name, status')
        .eq('status', 'approved');

      if (!pharmacies) return [];

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const rankings = await Promise.all(
        pharmacies.map(async (pharm) => {
          // Get schedules for this pharmacy
          const { data: schedules } = await supabase
            .from('schedules')
            .select('id')
            .eq('pharmacy_id', pharm.id)
            .gte('schedule_date', weekAgo);

          if (!schedules || schedules.length === 0) {
            return {
              id: pharm.id,
              name: pharm.name,
              town: pharm.town_name,
              tokens: 0,
              revenue: 0,
              growth: 0
            };
          }

          const scheduleIds = schedules.map(s => s.id);

          // Get tokens for this week
          const { data: tokens } = await supabase
            .from('tokens')
            .select('schedule_id, created_at, payment_status')
            .in('schedule_id', scheduleIds);

          const totalTokens = tokens?.length || 0;
          const revenue = tokens?.filter(t => t.payment_status === 'paid').length || 0;

          // Get last week's tokens for growth calculation
          const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const { data: lastWeekSchedules } = await supabase
            .from('schedules')
            .select('id')
            .eq('pharmacy_id', pharm.id)
            .gte('schedule_date', twoWeeksAgo)
            .lt('schedule_date', weekAgo);

          let lastWeekTokens = 0;
          if (lastWeekSchedules && lastWeekSchedules.length > 0) {
            const lastWeekScheduleIds = lastWeekSchedules.map(s => s.id);
            const { count } = await supabase
              .from('tokens')
              .select('*', { count: 'exact', head: true })
              .in('schedule_id', lastWeekScheduleIds);
            lastWeekTokens = count || 0;
          }

          const growth = lastWeekTokens > 0
            ? Math.round(((totalTokens - lastWeekTokens) / lastWeekTokens) * 100)
            : 0;

          return {
            id: pharm.id,
            name: pharm.name,
            town: pharm.town_name,
            tokens: totalTokens,
            revenue: revenue * 50, // Assuming ₹50 per token
            growth
          };
        })
      );

      return rankings.sort((a, b) => b.tokens - a.tokens);
    }
  );

  // Fetch at-risk pharmacies
  const { data: atRiskPharmacies, isLoading: atRiskLoading } = useSWR(
    'admin-at-risk-pharmacies',
    async () => {
      const { data: pharmacies } = await supabase
        .from('pharmacies')
        .select('id, name, status')
        .eq('status', 'approved');

      if (!pharmacies) return [];

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const atRisk = await Promise.all(
        pharmacies.map(async (pharm) => {
          const { data: schedules } = await supabase
            .from('schedules')
            .select('id')
            .eq('pharmacy_id', pharm.id)
            .gte('schedule_date', weekAgo);

          if (!schedules || schedules.length === 0) {
            return { id: pharm.id, name: pharm.name, tokens: 0, days: 7 };
          }

          const scheduleIds = schedules.map(s => s.id);
          const { data: tokens } = await supabase
            .from('tokens')
            .select('id')
            .in('schedule_id', scheduleIds);

          const tokenCount = tokens?.length || 0;

          if (tokenCount < 5) {
            return { id: pharm.id, name: pharm.name, tokens: tokenCount, days: 7 };
          }
          return null;
        })
      );

      return atRisk.filter(p => p !== null);
    }
  );

  const isLoading = platformLoading || rankingLoading || atRiskLoading;

  if (isLoading) {
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
          Platform Analytics
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          Monitor platform health and pharmacy performance across all towns
        </p>
      </div>

      {/* Platform Health Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
        <StatCard
          icon={<Building2 size={24} color="var(--primary)" />}
          label="Total Pharmacies"
          value={platformStats?.totalPharmacies || 0}
          subValue={`${platformStats?.activePharmacies || 0} active`}
          color="var(--primary)"
        />
        <StatCard
          icon={<Users size={24} color="var(--secondary)" />}
          label="Total Doctors"
          value={platformStats?.totalDoctors || 0}
          color="var(--secondary)"
        />
        <StatCard
          icon={<Activity size={24} color="var(--warning)" />}
          label="Tokens Today"
          value={platformStats?.todayTokens || 0}
          color="var(--warning)"
        />
        <StatCard
          icon={<Users size={24} color="var(--secondary)" />}
          label="Total Patients"
          value={platformStats?.totalPatients || 0}
          color="var(--secondary)"
        />
        <StatCard
          icon={<AlertCircle size={24} color="var(--danger)" />}
          label="Pending Approvals"
          value={platformStats?.pendingApprovals || 0}
          color="var(--danger)"
        />
      </div>

      {/* Pharmacy Performance Ranking */}
      <div className="card glass-panel" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <Star size={20} color="var(--warning)" />
            Pharmacy Performance Ranking
          </h2>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            {['week', 'month', 'all'].map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`btn ${selectedPeriod === period ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', fontSize: 'var(--text-xs)', fontWeight: 700 }}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {pharmacyRanking?.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            No pharmacy data available
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Rank</th>
                  <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Pharmacy</th>
                  <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Town</th>
                  <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Tokens</th>
                  <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Revenue</th>
                  <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Growth</th>
                </tr>
              </thead>
              <tbody>
                {pharmacyRanking?.slice(0, 10).map((pharm, idx) => (
                  <tr key={pharm.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 'var(--spacing-md)' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : 'var(--surface)',
                        color: idx < 3 ? 'white' : 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: 'var(--text-sm)'
                      }}>
                        {idx + 1}
                      </div>
                    </td>
                    <td style={{ padding: 'var(--spacing-md)', fontWeight: 700, color: 'var(--text-main)' }}>
                      {pharm.name}
                    </td>
                    <td style={{ padding: 'var(--spacing-md)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                      {pharm.town}
                    </td>
                    <td style={{ padding: 'var(--spacing-md)', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                      {pharm.tokens}
                    </td>
                    <td style={{ padding: 'var(--spacing-md)', textAlign: 'right', fontWeight: 700, color: 'var(--secondary)' }}>
                      ₹{pharm.revenue.toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--spacing-md)', textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 700,
                        color: pharm.growth >= 0 ? 'var(--secondary)' : 'var(--danger)',
                        fontSize: 'var(--text-sm)'
                      }}>
                        <TrendingUp size={14} style={{ transform: pharm.growth < 0 ? 'rotate(180deg)' : 'none' }} />
                        {Math.abs(pharm.growth)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* At-Risk Pharmacies */}
      <div className="card glass-panel">
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <AlertCircle size={20} color="var(--danger)" />
          At-Risk Pharmacies (Low Activity)
        </h2>

        {atRiskPharmacies?.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            All pharmacies are performing well! 🎉
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
            {atRiskPharmacies?.map(pharm => (
              <div
                key={pharm.id}
                style={{
                  padding: 'var(--spacing-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--danger)'
                }}
              >
                <div style={{ fontWeight: 800, color: 'var(--text-main)', marginBottom: 'var(--spacing-xs)' }}>
                  {pharm.name}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--spacing-sm)' }}>
                  Only {pharm.tokens} tokens in last 7 days
                </div>
                <Link
                  href={`/dashboard/settings`}
                  className="btn btn-outline"
                  style={{ width: '100%', fontSize: 'var(--text-xs)', fontWeight: 700, padding: 'var(--spacing-sm)' }}
                >
                  Review Account
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subValue, color }) {
  return (
    <div className="card glass-panel" style={{ padding: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
        <div style={{ padding: 'var(--spacing-sm)', backgroundColor: `${color}15`, borderRadius: 'var(--radius-md)' }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--text-main)', marginBottom: 'var(--spacing-xs)' }}>
        {value}
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
        {label}
      </div>
      {subValue && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary)', fontWeight: 700 }}>
          {subValue}
        </div>
      )}
    </div>
  );
}
