'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getTodayDate, formatTime } from '@/lib/utils';
import { CalendarCheck, Users, Activity, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { t } from '@/lib/i18n/translations';
import { getAuthUser } from '@/app/actions/auth';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [stats, setStats] = useState({ totalTokens: 0, waitingPatients: 0 });
  const [pharmacyPref, setPharmacyPref] = useState('en');
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = getTodayDate();
      const user = await getAuthUser();
      if (!user) return;

      const { data: pharmacy } = await supabase.from('pharmacies').select('id, language').eq('user_id', user.id).single();
      
      if (pharmacy) {
        setPharmacyPref(pharmacy.language || 'en');
        
        let { data: todaysSchedules } = await supabase
          .from('schedules')
          .select(`
            id, start_time, end_time, delay_minutes,
            doctors(name, specialty)
          `)
          .eq('pharmacy_id', pharmacy.id)
          .eq('schedule_date', today);
          
        if (todaysSchedules && todaysSchedules.length > 0) {
          const scheduleIds = todaysSchedules.map(s => s.id);
          
          let { data: tokens } = await supabase
            .from('tokens')
            .select('id, status')
            .in('schedule_id', scheduleIds);
            
          const waiting = tokens ? tokens.filter(t => t.status === 'waiting').length : 0;
          setStats({ totalTokens: tokens?.length || 0, waitingPatients: waiting });
        }
        
        setSchedules(todaysSchedules || []);
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <Loader2 className="animate-spin" color="var(--primary)" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>{t('dashboard', pharmacyPref)}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
          <div style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)', color: 'var(--primary)' }}>
            <CalendarCheck size={28} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>{t('todaySchedules', pharmacyPref)}</p>
            <h2 style={{ fontSize: '1.75rem', margin: 0 }}>{schedules.length}</h2>
          </div>
        </div>

        <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)', color: 'var(--secondary)' }}>
            <Users size={28} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>{t('totalTokensToday', pharmacyPref)}</p>
            <h2 style={{ fontSize: '1.75rem', margin: 0 }}>{stats.totalTokens}</h2>
          </div>
        </div>

        <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
          <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)', color: 'var(--warning)' }}>
            <Activity size={28} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>{t('waitingPatients', pharmacyPref)}</p>
            <h2 style={{ fontSize: '1.75rem', margin: 0 }}>{stats.waitingPatients}</h2>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '2rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{t('todaySchedules', pharmacyPref)}</h2>
          <Link href="/dashboard/schedules" className="btn btn-outline btn-sm" style={{ padding: '0.5rem 1rem' }}>
            View All <ArrowRight size={16} />
          </Link>
        </div>

        {schedules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <CalendarCheck size={48} style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
            <p>{t('noSchedulesToday', pharmacyPref)}</p>
            <Link href="/dashboard/schedules" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              {t('addSchedule', pharmacyPref)}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {schedules.map(schedule => (
              <div key={schedule.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '1.25rem' }}>
                    {schedule.doctors?.name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', margin: '0 0 0.25rem 0' }}>Dr. {schedule.doctors?.name}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                      {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                      {schedule.delay_minutes > 0 && <span style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}>({schedule.delay_minutes}m delay)</span>}
                    </p>
                  </div>
                </div>
                <Link href={`/dashboard/queue?schedule=${schedule.id}`} className="btn btn-secondary">
                  {t('manageQueue', pharmacyPref)}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
