'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getAuthUser } from '@/app/actions/auth';
import { Loader2, Search, Plus, UserPlus, HeartPulse } from 'lucide-react';
import { t } from '@/lib/i18n/translations';

export default function DoctorsPage() {
  const [loading, setLoading] = useState(true);
  const [addingDoc, setAddingDoc] = useState(false);
  const [pharmacy, setPharmacy] = useState(null);
  const [allDoctors, setAllDoctors] = useState([]);
  const [myDoctors, setMyDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newDoc, setNewDoc] = useState({ name: '', specialty: '', phone: '', notes: '' });
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [editDoc, setEditDoc] = useState({ name: '', specialty: '', phone: '' });

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
      
      const { data: docs } = await supabase.from('doctors').select('*').order('name');
      setAllDoctors(docs || []);
      
      const { data: myDocs } = await supabase.from('pharmacy_doctors').select('doctor_id').eq('pharmacy_id', pData.id);
      setMyDoctors(myDocs?.map(d => d.doctor_id) || []);
    }
    setLoading(false);
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setAddingDoc(true);
    
    // Create new doctor
    const { data: created, error } = await supabase.from('doctors').insert([newDoc]).select();
    
    if (created && created[0]) {
      // Link to pharmacy automatically
      await supabase.from('pharmacy_doctors').insert([{
        pharmacy_id: pharmacy.id,
        doctor_id: created[0].id
      }]);
      
      setNewDoc({ name: '', specialty: '', phone: '', notes: '' });
      await fetchData();
    }
    setAddingDoc(false);
  };

  const toggleDoctorLink = async (doctorId, isLinked) => {
    if (isLinked) {
      await supabase.from('pharmacy_doctors').delete().eq('pharmacy_id', pharmacy.id).eq('doctor_id', doctorId);
    } else {
      await supabase.from('pharmacy_doctors').insert([{ pharmacy_id: pharmacy.id, doctor_id: doctorId }]);
    }
    fetchData();
  };

  const startEdit = (doctor) => {
    setEditingDoctorId(doctor.id);
    setEditDoc({ name: doctor.name, specialty: doctor.specialty || '', phone: doctor.phone || '' });
  };

  const submitEditRequest = async (e) => {
    e.preventDefault();
    await supabase.from('doctor_edit_requests').insert([{
      doctor_id: editingDoctorId,
      pharmacy_id: pharmacy.id,
      suggested_name: editDoc.name,
      suggested_specialty: editDoc.specialty,
      suggested_phone: editDoc.phone
    }]);
    setEditingDoctorId(null);
    alert('Edit suggestion sent globally to Platform Admin for approval.');
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}><Loader2 className="animate-spin" color="var(--primary)" size={32} /></div>;

  const pref = pharmacy?.language || 'en';
  const filteredDoctors = allDoctors.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || (d.specialty && d.specialty.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>{t('doctors', pref)}</h1>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        {/* Left Col: Search & List */}
        <div style={{ flex: '1 1 400px' }}>
          <div className="card glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HeartPulse size={20} color="var(--primary)" />
              {t('doctorRegistry', pref)}
            </h2>
            
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '3rem' }} 
                placeholder={t('searchDoctors', pref)} 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredDoctors.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('noDoctors', pref)}</p>
              ) : (
                filteredDoctors.map(doctor => {
                  const isLinked = myDoctors.includes(doctor.id);
                  const isEditing = editingDoctorId === doctor.id;
                  
                  return (
                    <div key={doctor.id} style={{ display: 'flex', flexDirection: 'column', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: isLinked ? 'var(--surface-hover)' : 'var(--surface)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>Dr. {doctor.name}</h3>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{doctor.specialty || 'General'}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {isLinked && !isEditing && (
                            <button onClick={() => startEdit(doctor)} className="btn btn-outline" style={{ padding: '0.5rem', fontSize: '0.875rem' }}>Suggest Edit</button>
                          )}
                          <button 
                            onClick={() => toggleDoctorLink(doctor.id, isLinked)}
                            className={`btn ${isLinked ? 'btn-outline' : 'btn-primary'}`}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                          >
                            {isLinked ? t('unlink', pref) : t('linkToPharmacy', pref)}
                          </button>
                        </div>
                      </div>
                      
                      {isEditing && (
                        <form onSubmit={submitEditRequest} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-main)' }}>Suggest Edits to Admin</h4>
                          <input type="text" className="form-input form-input-sm" value={editDoc.name} onChange={e => setEditDoc({...editDoc, name: e.target.value})} placeholder="Doctor Name" required />
                          <input type="text" className="form-input form-input-sm" value={editDoc.specialty} onChange={e => setEditDoc({...editDoc, specialty: e.target.value})} placeholder="Specialty" />
                          <input type="tel" className="form-input form-input-sm" value={editDoc.phone} onChange={e => setEditDoc({...editDoc, phone: e.target.value})} placeholder="Phone" />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="submit" className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Submit Edit</button>
                            <button type="button" onClick={() => setEditingDoctorId(null)} className="btn btn-outline btn-sm">Cancel</button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Add New */}
        <div style={{ flex: '1 1 300px' }}>
          <div className="card glass-panel" style={{ padding: '2rem', backgroundColor: 'var(--surface)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={20} color="var(--secondary)" />
              {t('addNewDoctor', pref)}
            </h2>
            
            <form onSubmit={handleCreateDoctor}>
              <div className="form-group">
                <label className="form-label">{t('doctorName', pref)}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Dr.</span>
                  <input type="text" className="form-input" required value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} placeholder="John Doe" />
                </div>
                {newDoc.name.length > 2 && allDoctors.some(d => d.name.toLowerCase().includes(newDoc.name.toLowerCase())) && (
                  <p style={{ color: 'var(--warning)', fontSize: '0.75rem', marginTop: '0.5rem', lineHeight: 1.4 }}>
                    <strong>Notice:</strong> A doctor matching "{newDoc.name}" already exists globally! Search locally on the left instead of creating a duplicate.
                  </p>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">{t('specialty', pref)} ({t('optional', pref)})</label>
                <input type="text" className="form-input" value={newDoc.specialty} onChange={e => setNewDoc({...newDoc, specialty: e.target.value})} placeholder="Cardiologist, General Physician..." />
              </div>
              
              <div className="form-group">
                <label className="form-label">{t('doctorPhone', pref)} ({t('optional', pref)})</label>
                <input type="tel" className="form-input" value={newDoc.phone} onChange={e => setNewDoc({...newDoc, phone: e.target.value})} placeholder="+91..." />
              </div>
              
              <div className="form-group">
                <label className="form-label">{t('notes', pref)}</label>
                <textarea className="form-input" style={{ minHeight: '80px', resize: 'vertical' }} value={newDoc.notes} onChange={e => setNewDoc({...newDoc, notes: e.target.value})}></textarea>
              </div>
              
              <button type="submit" className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} disabled={addingDoc || !newDoc.name}>
                {addingDoc ? <Loader2 className="animate-spin" size={20} /> : <><Plus size={20} /> {t('addDoctor', pref)}</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
