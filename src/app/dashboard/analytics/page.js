'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import useSWR from 'swr';
import { Loader2, TrendingUp, Users, CheckCircle2, Clock, IndianRupee, Calendar, Activity } from 'lucide-react';
import { getAuthUser } from '@/app/actions/auth';
import { t } from '@/lib/i18n/translations';
import Link from 'next/link';

export default function AnalyticsPage() {
  const supabase = createClient();
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  // Fetch pharmacy data
  const { data: pharmacy, isLoading: pharmacyLoading } = useSWR(
    'analytics-pharmacy',
    async () => {
      const user = await getAuthUser();
      if (!user) return null;
      const { data } = await supabase.from('pharmacies').select('*').eq('user_id', user.id).single();
      return data;
    }
  );

  // Fetch today's stats
  const { data: todayStats, isLoading: statsLoading } = useSWR(
    pharmacy ? `analytics-today-${pharmacy.id}` : null,
    async () => {
      if (!pharmacy) return null;
      const today = new Date().toISOString().split('T')[0];

      // Get today's schedules
      const { data: schedules } = await supabase
        .from('schedules')
        .select('id, doctor_id, schedule_date')
        .eq('pharmacy_id', pharmacy.id)
        .eq('schedule_date', today);

      if (!schedules || schedules.length === 0) {
        return { totalTokens: 0, completed: 0, waiting: 0, revenue: 0 };
      }

      const scheduleIds = schedules.map(s => s.id);

      // Get tokens for today
      const { data: tokens } = await supabase
        .from('tokens')
        .select('status, payment_status')
        .in('schedule_id', scheduleIds);

      const totalTokens = tokens?.length || 0;
      const completed = tokens?.filter(t => t.status === 'completed').length || 0;
      const waiting = tokens?.filter(t => t.status === 'waiting').length || 0;
      const revenue = tokens?.filter(t => t.payment_status === 'paid').length || 0;

      return { totalTokens, completed, waiting, revenue };
    }
  );

  // Fetch doctor performance
  const { data: doctorPerformance, isLoading: doctorLoading } = useSWR(
    pharmacy ? `analytics-doctors-${pharmacy.id}` : null,
    async () => {
      if (!pharmacy) return [];
      const today = new Date().toISOString().split('T')[0];

      const { data: schedules } = await supabase
        .from('schedules')
        .select(`
          id,
          doctor_id,
          delay_minutes,
          start_time,
          end_time,
          doctors(name, specialty),
          tokens(status)
        `)
        .eq('pharmacy_id', pharmacy.id)
        .eq('schedule_date', today);

      if (!schedules) return [];

      return schedules.map(sched => ({
        doctorName: sched.doctors?.name || 'Unknown',
        specialty: sched.doctors?.specialty || 'General',
        totalTokens: sched.tokens?.length || 0,
        completed: sched.tokens?.filter(t => t.status === 'completed').length || 0,
        waiting: sched.tokens?.filter(t => t.status === 'waiting').length || 0,
        delay: sched.delay_minutes || 0,
        startTime: sched.start_time,
        endTime: sched.end_time
      }));
    }
  );

  // Fetch patient retention
  const { data: patientStats, isLoading: patientLoading } = useSWR(
    pharmacy ? `analytics-patients-${pharmacy.id}` : null,
    async () => {
      if (!pharmacy) return { newPatients: 0, repeatPatients: 0, topPatients: [] };

      // Get all tokens for this pharmacy
      const { data: allSchedules } = await supabase
        .from('schedules')
        .select('id')
        .eq('pharmacy_id', pharmacy.id);

      if (!allSchedules) return { newPatients: 0, repeatPatients: 0, topPatients: [] };

      const scheduleIds = allSchedules.map(s => s.id);

      const { data: tokens } = await supabase
        .from('tokens')
        .select('patient_id')
        .in('schedule_id', scheduleIds);

      if (!tokens) return { newPatients: 0, repeatPatients: 0, topPatients: [] };

      // Count visits per patient
      const visitCount = {};
      tokens.forEach(t => {
        visitCount[t.patient_id] = (visitCount[t.patient_id] || 0) + 1;
      });

      const patientIds = Object.keys(visitCount);
      const newPatients = patientIds.filter(id => visitCount[id] === 1).length;
      const repeatPatients = patientIds.filter(id => visitCount[id] > 1).length;

      // Get top patients
      const { data: topPatientsData } = await supabase
        .from('patients')
        .select('id, name, phone')
        .in('id', patientIds)
        .order('id', { limit: 5 });

      const topPatients = (topPatientsData || []).map(p => ({
        name: p.name,
        visits: visitCount[p.id]
      })).sort((a, b) => b.visits - a.visits).slice(0, 5);

      return { newPatients, repeatPatients, topPatients };
    }
  );

  const isLoading = pharmacyLoading || statsLoading || doctorLoading || patientLoading;
  const pref = pharmacy?.language || 'en';

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
          Analytics & Reports
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          Track your pharmacy performance and patient insights
        </p>
      </div>

      {/* Period Selector */}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
        {['today', 'week', 'month'].map(period => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`btn ${selectedPeriod === period ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--text-sm)', fontWeight: 700 }}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {/* Today's Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
        <StatCard
          icon={<Activity size={24} color="var(--primary)" />}
          label="Total Tokens"
          value={todayStats?.totalTokens || 0}
          trend="+12%"
          color="var(--primary)"
        />
        <StatCard
          icon={<CheckCircle2 size={24} color="var(--secondary)" />}
          label="Completed"
          value={todayStats?.completed || 0}
          trend="+8%"
          color="var(--secondary)"
        />
        <StatCard
          icon={<Clock size={24} color="var(--warning)" />}
          label="Waiting"
          value={todayStats?.waiting || 0}
          trend="-5%"
          color="var(--warning)"
        />
        <StatCard
          icon={<IndianRupee size={24} color="var(--secondary)" />}
          label="Revenue (₹)"
          value={todayStats?.revenue * 50 || 0}
          trend="+15%"
          color="var(--secondary)"
        />
      </div>

      {/* Doctor Performance */}
      <div className="card glass-panel" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <Users size={20} color="var(--primary)" />
          Doctor Performance - Today
        </h2>

        {doctorPerformance?.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            No schedules for today
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {doctorPerformance?.map((doctor, idx) => (
              <div
                key={idx}
                style={{
                  padding: 'var(--spacing-md)',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: idx % 2 === 0 ? 'var(--surface)' : 'var(--background)',
                  border: doctor.delay > 0 ? '1px solid var(--warning)' : '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--text-main)' }}>
                      Dr. {doctor.doctorName}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                      {doctor.specialty}
                    </div>
                  </div>
                  {doctor.delay > 0 && (
                    <div className="badge" style={{ backgroundColor: 'var(--warning)', color: 'white', fontWeight: 700 }}>
                      +{doctor.delay} min delay
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--spacing-xs)' }}>
                      Progress ({doctor.completed}/{doctor.totalTokens})
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${doctor.totalTokens > 0 ? (doctor.completed / doctor.totalTokens) * 100 : 0}%`,
                          backgroundColor: 'var(--primary)',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--text-main)' }}>
                      {doctor.totalTokens > 0 ? Math.round((doctor.completed / doctor.totalTokens) * 100) : 0}%
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Complete</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-sm)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  <span>⏰ {doctor.startTime?.slice(0,5)} - {doctor.endTime?.slice(0,5)}</span>
                  <span>👥 {doctor.waiting} waiting</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Patient Retention */}
      <div className="card glass-panel">
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <Users size={20} color="var(--secondary)" />
          Patient Retention
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
          <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--primary)', marginBottom: 'var(--spacing-xs)' }}>
              {patientStats?.newPatients || 0}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 700 }}>New Patients</div>
          </div>
          <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--secondary)', marginBottom: 'var(--spacing-xs)' }}>
              {patientStats?.repeatPatients || 0}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 700 }}>Repeat Patients</div>
          </div>
          <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--warning)', marginBottom: 'var(--spacing-xs)' }}>
              {patientStats?.newPatients && patientStats?.repeatPatients
                ? Math.round((patientStats.repeatPatients / (patientStats.newPatients + patientStats.repeatPatients)) * 100)
                : 0}%
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 700 }}>Retention Rate</div>
          </div>
        </div>

        {patientStats?.topPatients && patientStats.topPatients.length > 0 && (
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-main)', marginBottom: 'var(--spacing-sm)' }}>
              Top Loyal Patients
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {patientStats.topPatients.map((patient, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    backgroundColor: 'var(--surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 'var(--text-sm)'
                    }}>
                      {idx + 1}
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 'var(--text-sm)' }}>
                      {patient.name}
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 'var(--text-sm)' }}>
                    {patient.visits} visits
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color }) {
  return (
    <div className="card glass-panel" style={{ padding: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
        <div style={{ padding: 'var(--spacing-sm)', backgroundColor: `${color}15`, borderRadius: 'var(--radius-md)' }}>
          {icon}
        </div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', fontWeight: 700, color: trend.startsWith('+') ? 'var(--secondary)' : 'var(--danger)' }}>
            <TrendingUp size={14} />
            {trend}
          </div>
        )}
      </div>
      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--text-main)', marginBottom: 'var(--spacing-xs)' }}>
        {value}
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}
