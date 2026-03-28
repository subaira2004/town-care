'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CalendarCheck, Clock, Plus, Trash2 } from 'lucide-react';
import { getTodayDate, formatTime, formatDate } from '@/lib/utils';
import { getAuthUser } from '@/app/actions/auth';
import { t } from '@/lib/i18n/translations';

export default function SchedulesPage() {
  const [loading, setLoading] = useState(true);
  const [addingSched, setAddingSched] = useState(false);
  const [pharmacy, setPharmacy] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [schedules, setSchedules] = useState([]);
  
  const [newSched, setNewSched] = useState({ 
    doctor_id: '', 
    schedule_date: getTodayDate(), 
    start_time: '17:00', 
    end_time: '20:00',
    avg_consultation_minutes: 15
  });
  
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const user = await getAuthUser();
    if (!user) return;

    const { data: pData } = await supabase.from('pharmacies').select('*').eq('user_id', user.id).single();
    if (pData) {
      setPharmacy(pData);
      
      // Fetch linked doctors
      const { data: linkedDocs } = await supabase.from('pharmacy_doctors').select('doctor_id, doctors(id, name, specialty)').eq('pharmacy_id', pData.id);
      setDoctors(linkedDocs?.map(d => d.doctors) || []);
      
      // Fetch schedules from today onwards
      const today = getTodayDate();
      const { data: scheds } = await supabase.from('schedules').select('*, doctors(name)').eq('pharmacy_id', pData.id).gte('schedule_date', today).order('schedule_date').order('start_time');
      setSchedules(scheds || []);
      
      if (linkedDocs && linkedDocs.length > 0) {
        setNewSched(prev => ({ ...prev, doctor_id: linkedDocs[0].doctors.id }));
      }
    }
    setLoading(false);
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    setAddingSched(true);
    
    // Create new schedule
    const { data: created, error } = await supabase.from('schedules').insert([{
      ...newSched,
      pharmacy_id: pharmacy.id
    }]);
    
    if (!error) {
      await fetchData();
    }
    setAddingSched(false);
  };

  const handleDeleteSchedule = async (id) => {
    if (confirm('Are you sure you want to delete this schedule? This will also delete all tokens connected to it.')) {
      await supabase.from('schedules').delete().eq('id', id);
      fetchData();
    }
  };

  const pref = pharmacy?.language || 'en';

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}><Loader2 className="animate-spin" color="var(--primary)" size={32} /></div>;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>{t('schedules', pref)}</h1>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        {/* Left Col: Upcoming Schedules */}
        <div style={{ flex: '1 1 400px' }}>
          <div className="card glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarCheck size={20} color="var(--primary)" />
              Upcoming Schedules
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {schedules.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('noSchedules', pref)}</p>
              ) : (
                schedules.map(sched => (
                  <div key={sched.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Dr. {sched.doctors?.name}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <span><CalendarCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {formatDate(sched.schedule_date)}</span>
                        <span><Clock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {formatTime(sched.start_time)} - {formatTime(sched.end_time)}</span>
                      </p>
                    </div>
                    <button onClick={() => handleDeleteSchedule(sched.id)} style={{ padding: '0.5rem', border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Add Schedule */}
        <div style={{ flex: '1 1 300px' }}>
          <div className="card glass-panel" style={{ padding: '2rem', backgroundColor: 'var(--surface)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} color="var(--secondary)" />
              {t('addSchedule', pref)}
            </h2>
            
            {doctors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                <p>No doctors linked to pharmacy.</p>
                <a href="/dashboard/doctors" style={{ color: 'var(--primary)', fontWeight: '500' }}>Link Doctor First</a>
              </div>
            ) : (
              <form onSubmit={handleCreateSchedule}>
                <div className="form-group">
                  <label className="form-label">{t('selectDoctor', pref)}</label>
                  <select className="form-select" value={newSched.doctor_id} onChange={e => setNewSched({...newSched, doctor_id: e.target.value})} required>
                    <option value="" disabled>Select</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialty})</option>)}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">{t('scheduleDate', pref)}</label>
                  <input type="date" className="form-input" min={getTodayDate()} value={newSched.schedule_date} onChange={e => setNewSched({...newSched, schedule_date: e.target.value})} required />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">{t('startTime', pref)}</label>
                    <input type="time" className="form-input" value={newSched.start_time} onChange={e => setNewSched({...newSched, start_time: e.target.value})} required />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">{t('endTime', pref)}</label>
                    <input type="time" className="form-input" value={newSched.end_time} onChange={e => setNewSched({...newSched, end_time: e.target.value})} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('avgConsultation', pref)}</label>
                  <select className="form-select" value={newSched.avg_consultation_minutes} onChange={e => setNewSched({...newSched, avg_consultation_minutes: parseInt(e.target.value)})} required>
                    <option value="5">5 {t('minutes', pref)}</option>
                    <option value="10">10 {t('minutes', pref)}</option>
                    <option value="15">15 {t('minutes', pref)}</option>
                    <option value="20">20 {t('minutes', pref)}</option>
                    <option value="30">30 {t('minutes', pref)}</option>
                  </select>
                </div>
                
                <button type="submit" className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} disabled={addingSched || !newSched.doctor_id}>
                  {addingSched ? <Loader2 className="animate-spin" size={20} /> : <>{t('addSchedule', pref)}</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
