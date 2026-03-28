'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Loader2, Users, Search, Plus, UserPlus, Phone, QrCode } from 'lucide-react';
import { getTodayDate, generateStatusUrl, getWhatsAppUrl, getSmsUrl } from '@/lib/utils';
import { getAuthUser } from '@/app/actions/auth';
import { t, getShareMessage, getStatusLabel } from '@/lib/i18n/translations';

function QueueContent() {
  const [loading, setLoading] = useState(true);
  const [pharmacy, setPharmacy] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [tokens, setTokens] = useState([]);
  
  // Patient search/add state
  const [searchPhone, setSearchPhone] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientData, setNewPatientData] = useState({ name: '', relation: 'Self' });
  const [bookingType, setBookingType] = useState('walk_in');
  const [addingToken, setAddingToken] = useState(false);
  
  const searchParams = useSearchParams();
  const initialSchedule = searchParams.get('schedule');
  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedScheduleId) {
      const sched = schedules.find(s => s.id === selectedScheduleId);
      setSelectedSchedule(sched);
      fetchTokens(selectedScheduleId);

      const channel = supabase
        .channel('public:tokens')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens', filter: `schedule_id=eq.${selectedScheduleId}` }, payload => {
          fetchTokens(selectedScheduleId);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); }
    }
  }, [selectedScheduleId, schedules]);

  const fetchInitialData = async () => {
    setLoading(true);
    const user = await getAuthUser();
    if (!user) return;
    const { data: pData } = await supabase.from('pharmacies').select('*').eq('user_id', user.id).single();
    if (pData) {
      setPharmacy(pData);
      const today = getTodayDate();
      const { data: scheds } = await supabase.from('schedules').select('*, doctors(name)').eq('pharmacy_id', pData.id).eq('schedule_date', today);
      setSchedules(scheds || []);
      
      if (initialSchedule && scheds?.some(s => s.id === initialSchedule)) {
        setSelectedScheduleId(initialSchedule);
      } else if (scheds && scheds.length > 0) {
        setSelectedScheduleId(scheds[0].id);
      }
    }
    setLoading(false);
  };

  const fetchTokens = async (schedId) => {
    const { data } = await supabase.from('tokens').select('*, patients(phone, name)').eq('schedule_id', schedId).order('token_number');
    setTokens(data || []);
  };

  const handlePhoneSearch = async () => {
    if (!searchPhone || searchPhone.length < 5) return;
    const { data } = await supabase.from('patients').select('*').eq('phone', searchPhone);
    setPatientResults(data || []);
    setIsNewPatient(data?.length === 0);
    if (data && data.length > 0) {
      setSelectedPatientId(data[0].id);
    } else {
      setSelectedPatientId('');
    }
  };

  const handleAddToken = async (e) => {
    e.preventDefault();
    setAddingToken(true);
    let patientId = selectedPatientId;
    
    // Create patient if needed
    if (isNewPatient || !patientId) {
      const { data: created, error } = await supabase.from('patients').insert([{
        phone: searchPhone,
        name: newPatientData.name,
        relation: newPatientData.relation || null
      }]).select();
      if (!error && created?.length > 0) {
        patientId = created[0].id;
      }
    }
    
    if (patientId && selectedScheduleId) {
      // Get next token number
      const maxToken = tokens.reduce((max, t) => Math.max(max, t.token_number), 0);
      const nextNum = maxToken + 1;
      
      await supabase.from('tokens').insert([{
        schedule_id: selectedScheduleId,
        patient_id: patientId,
        token_number: nextNum,
        booking_type: bookingType,
        status: 'waiting',
        payment_method: null,
        payment_status: 'requested'
      }]);
      
      setSearchPhone('');
      setPatientResults([]);
      setIsNewPatient(false);
      setNewPatientData({ name: '', relation: 'Self' });
      setSelectedPatientId('');
    }
    setAddingToken(false);
  };

  const updateTokenStatus = async (tokenId, newStatus) => {
    await supabase.from('tokens').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', tokenId);
  };

  const pref = pharmacy?.language || 'en';

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}><Loader2 className="animate-spin" color="var(--primary)" size={32} /></div>;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>{t('tokenQueue', pref)}</h1>
        {schedules.length > 0 && (
          <select className="form-select" style={{ width: 'auto', minWidth: '250px' }} value={selectedScheduleId} onChange={e => setSelectedScheduleId(e.target.value)}>
            {schedules.map(s => <option key={s.id} value={s.id}>Dr. {s.doctors?.name} ({s.start_time})</option>)}
          </select>
        )}
      </div>

      {schedules.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <Users size={48} style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
          <p>{t('noSchedulesToday', pref)}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
          {/* Main Queue Area */}
          <div style={{ flex: '1 1 500px' }}>
            <div className="card glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} color="var(--primary)" />
                  Queue: Dr. {selectedSchedule?.doctors?.name}
                </h2>
              </div>
              
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tokens.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('noTokens', pref)}</p>
                ) : (
                  tokens.map(token => (
                    <div key={token.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: token.status === 'in_consultation' ? 'rgba(16,185,129,0.1)' : 'var(--surface)', borderLeft: token.status === 'in_consultation' ? '4px solid var(--secondary)' : '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {token.token_number}
                        </div>
                        <div>
                          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>{token.patients?.name}</h3>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{token.patients?.phone} • {t(token.booking_type === 'phone' ? 'phoneBooking' : 'walkIn', pref)}</p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className={`badge badge-${token.status === 'in_consultation' ? 'active' : token.status.replace('_', '-')}`}>{getStatusLabel(token.status, pref)}</span>
                        
                        {token.status === 'waiting' && <button onClick={() => updateTokenStatus(token.id, 'in_consultation')} className="btn btn-secondary btn-sm" style={{ padding: '0.375rem 0.75rem' }}>Start</button>}
                        {token.status === 'in_consultation' && <button onClick={() => updateTokenStatus(token.id, 'completed')} className="btn btn-primary btn-sm" style={{ padding: '0.375rem 0.75rem' }}>Done</button>}
                        
                        {/* Share dropdown / buttons */}
                        <div style={{ position: 'relative', display: 'flex', gap: '0.25rem' }}>
                            <a href={getWhatsAppUrl(getShareMessage(pref, { pharmacyName: pharmacy.name, doctorName: selectedSchedule?.doctors?.name, tokenNumber: token.token_number, status: token.status, statusLink: generateStatusUrl(token.id) }))} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '0.375rem' }} title="WhatsApp">WA</a>
                            <a href={getSmsUrl(getShareMessage(pref, { pharmacyName: pharmacy.name, doctorName: selectedSchedule?.doctors?.name, tokenNumber: token.token_number, status: token.status, statusLink: generateStatusUrl(token.id) }))} className="btn btn-outline" style={{ padding: '0.375rem' }} title="SMS">SMS</a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* New Token Form */}
          <div style={{ flex: '1 1 300px' }}>
            <div className="card glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} color="var(--secondary)" />
                {t('addToken', pref)}
              </h2>
              
              <div className="form-group">
                <label className="form-label">{t('patientPhone', pref)}</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Phone style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                    <input type="tel" className="form-input" style={{ paddingLeft: '2.5rem' }} value={searchPhone} onChange={e => { setSearchPhone(e.target.value); if(e.target.value.length < 5) setPatientResults([]); }} placeholder="+91..." />
                  </div>
                  <button onClick={handlePhoneSearch} type="button" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}><Search size={18} /></button>
                </div>
              </div>

              {searchPhone.length >= 5 && (
                <form onSubmit={handleAddToken}>
                  {patientResults.length > 0 ? (
                    <div className="form-group animate-fade-in" style={{ padding: '1rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
                      <label className="form-label">{t('existingPatients', pref)}</label>
                      <select className="form-select" value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)}>
                        <option value="">-- {t('selectPatient', pref)} --</option>
                        {patientResults.map(p => <option key={p.id} value={p.id}>{p.name} ({p.relation || 'Self'})</option>)}
                      </select>
                      
                      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <button type="button" onClick={() => { setIsNewPatient(true); setPatientResults([]); }} className="btn btn-outline" style={{ width: '100%', fontSize: '0.875rem' }}>
                          <UserPlus size={16} style={{ marginRight: '0.5rem' }} /> {t('addNewPatient', pref)} Under Same #
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {isNewPatient && (
                    <div className="form-group animate-fade-in" style={{ padding: '1rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem' }}>{t('addNewPatient', pref)}</h4>
                      <input type="text" className="form-input" style={{ marginBottom: '0.75rem' }} value={newPatientData.name} onChange={e => setNewPatientData({...newPatientData, name: e.target.value})} placeholder={t('patientName', pref)} required />
                      <input type="text" className="form-input" value={newPatientData.relation} onChange={e => setNewPatientData({...newPatientData, relation: e.target.value})} placeholder={t('relationHint', pref)} />
                    </div>
                  )}

                  {(selectedPatientId || (isNewPatient && newPatientData.name)) && (
                    <>
                      <div className="form-group mt-4">
                        <label className="form-label">{t('bookingType', pref)}</label>
                        <select className="form-select" value={bookingType} onChange={e => setBookingType(e.target.value)}>
                          <option value="walk_in">{t('walkIn', pref)}</option>
                          <option value="phone">{t('phoneBooking', pref)}</option>
                        </select>
                      </div>
                      
                      <button type="submit" className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} disabled={addingToken}>
                        {addingToken ? <Loader2 className="animate-spin" size={20} /> : <>{t('addToken', pref)}</>}
                      </button>
                    </>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}><Loader2 className="animate-spin" color="var(--primary)" size={32} /></div>}>
      <QueueContent />
    </Suspense>
  );
}
