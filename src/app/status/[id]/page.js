'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { Loader2, User, Activity, Clock, HeartPulse, QrCode } from 'lucide-react';
import { t, getStatusLabel } from '@/lib/i18n/translations';
import { calculateEstimatedWait, getCurrentToken } from '@/lib/utils';
import '../../globals.css';

export default function TokenStatusPage() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [pharmacy, setPharmacy] = useState(null);
  const [allTokens, setAllTokens] = useState([]);
  
  const params = useParams();
  const id = params.id;
  const supabase = createClient();

  useEffect(() => {
    if (id) {
      fetchData();
      
      const channel = supabase
        .channel(`public:token:${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens' }, payload => {
          // A token in same schedule might have updated
          // Or this token specifically. Re-fetch all tokens to recalculate wait.
          fetchTokens(token?.schedule_id);
        })
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
    }
  }, [id, token?.schedule_id]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch this token
    const { data: tData } = await supabase.from('tokens').select('*, patients(name)').eq('id', id).single();
    if (tData) {
      setToken(tData);
      
      // Fetch Schedule & Doctor
      const { data: sData } = await supabase.from('schedules').select('*, doctors(name, specialty)').eq('id', tData.schedule_id).single();
      if (sData) {
        setSchedule(sData);
        
        // Fetch Pharmacy
        const { data: pData } = await supabase.from('pharmacies').select('*').eq('id', sData.pharmacy_id).single();
        if (pData) setPharmacy(pData);
      }
      
      await fetchTokens(tData.schedule_id);
    }
    setLoading(false);
  };

  const fetchTokens = async (schedId) => {
    if (!schedId) return;
    const { data } = await supabase.from('tokens').select('id, token_number, status').eq('schedule_id', schedId);
    setAllTokens(data || []);
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" color="var(--primary)" size={48} /></div>;

  if (!token || !schedule || !pharmacy) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <Activity size={64} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
        <h1>Token Not Found</h1>
        <p style={{ color: 'var(--text-muted)' }}>This token link is invalid or has expired.</p>
      </div>
    );
  }

  const pref = pharmacy?.language || 'en';
  const currentTokenNum = getCurrentToken(allTokens);
  const estimatedWait = calculateEstimatedWait(token.token_number, currentTokenNum, schedule.avg_consultation_minutes, schedule.delay_minutes);

  const getStatusColor = (status) => {
    switch (status) {
      case 'in_consultation': return 'var(--secondary)';
      case 'completed': return 'var(--primary)';
      case 'skipped': return 'var(--text-muted)';
      case 'cancelled': return 'var(--danger)';
      default: return 'var(--warning)';
    }
  };

  const statusColor = getStatusColor(token.status);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '1rem', backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '800', color: 'var(--primary)' }}>{pharmacy.name}</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>{pharmacy.town}</p>
      </header>

      {/* Main Status Board */}
      <main className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        
        {/* Your Token Big Box */}
        <div className="card" style={{ padding: '2rem 1.5rem', textAlign: 'center', borderTop: `4px solid ${statusColor}`, backgroundColor: 'var(--surface)' }}>
          <p style={{ textTransform: 'uppercase', fontSize: '0.875rem', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{t('yourToken', pref)}</p>
          <div style={{ fontSize: '4.5rem', fontWeight: '800', lineHeight: 1, marginBottom: '1rem', color: statusColor }}>
            #{token.token_number}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <span className={`badge badge-${token.status === 'in_consultation' ? 'active' : token.status.replace('_', '-')}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
              {getStatusLabel(token.status, pref)}
            </span>
          </div>

          <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-main)' }}>{token.patients?.name}</h2>
        </div>

        {/* Live Queue Info */}
        {token.status === 'waiting' && (
          <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{t('currentlyServing', pref)}</p>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Activity size={24} className="pulse-indicator" /> #{currentTokenNum || '--'}
              </div>
            </div>
            
            <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{t('estimatedWaitTime', pref)}</p>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Clock size={24} /> {estimatedWait > 0 ? `${estimatedWait} ${t('minutes', pref)}` : '--'}
              </div>
            </div>
          </div>
        )}

        {/* Doctor Info */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HeartPulse size={18} /> {t('doctorInfo', pref)}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.25rem' }}>
              {schedule.doctors?.name?.charAt(0)}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: '600', fontSize: '1.125rem' }}>Dr. {schedule.doctors?.name}</p>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>{schedule.doctors?.specialty}</p>
            </div>
          </div>
        </div>

        {/* Payment / QR Section (if enabled and applicable) */}
        {pharmacy.payment_required && token.payment_status !== 'paid' && pharmacy.upi_qr_url && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', border: '2px dashed var(--secondary)' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <QrCode size={20} color="var(--secondary)" /> {t('payNow', pref)} (₹{pharmacy.token_fee})
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {t('scanQr', pref)}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <img src={pharmacy.upi_qr_url} alt="UPI QR Code" style={{ width: '250px', maxWidth: '100%', height: 'auto', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {t('paymentDisclaimer', pref)}
            </p>
          </div>
        )}

      </main>

      <footer style={{ marginTop: 'auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Powered by <strong>Town Care</strong>
        </p>
      </footer>
    </div>
  );
}
