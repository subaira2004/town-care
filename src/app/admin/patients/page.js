'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Search, Edit2, Trash2, ChevronLeft, ChevronRight, X as XIcon, Users, Check } from 'lucide-react';

export default function AdminPatientsPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [towns, setTowns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Edit / Add Modal
  const [editingPatient, setEditingPatient] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [page, searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Fetch Edit Requests
    const { data: rData } = await supabase.from('patient_edit_requests')
      .select('*, patients(name, phone), pharmacies(name)')
      .eq('status', 'pending');
    setRequests(rData || []);

    // 2. Fetch Towns for dropdown
    const { data: tData } = await supabase.from('towns').select('id, name').eq('is_active', true).order('name');
    setTowns(tData || []);

    // 3. Fetch Master Registry (Paginated)
    let query = supabase.from('patients').select('*', { count: 'exact' });
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (!error) {
      setPatients(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const resolveRequest = async (req, decision) => {
    if (decision === 'approved') {
      const updates = {};
      if (req.suggested_name) updates.name = req.suggested_name;
      if (req.suggested_phone) updates.phone = req.suggested_phone;
      if (req.suggested_town) {
        updates.town_name = req.suggested_town;
        // Search town ID mapping if possible or just update town_name fallback
        const matchingTown = towns.find(t => t.name.toLowerCase() === req.suggested_town.toLowerCase());
        if (matchingTown) updates.town_id = matchingTown.id;
      }
      await supabase.from('patients').update(updates).eq('id', req.patient_id);
    }
    await supabase.from('patient_edit_requests').update({ status: decision }).eq('id', req.id);
    fetchData();
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const town_id = formData.get('town_id');
    const town_name = towns.find(t => t.id === town_id)?.name || '';

    const updates = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      relation: formData.get('relation'),
      town_id: town_id || null,
      town_name: town_name
    };

    await supabase.from('patients').update(updates).eq('id', editingPatient.id);
    setEditingPatient(null);
    fetchData();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const town_id = formData.get('town_id');
    const town_name = towns.find(t => t.id === town_id)?.name || '';

    const updates = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      relation: formData.get('relation'),
      town_id: town_id || null,
      town_name: town_name
    };

    await supabase.from('patients').insert([updates]);
    setIsAdding(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this patient record? This will remove all their appointment history.')) {
      await supabase.from('patients').delete().eq('id', id);
      fetchData();
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>Patient Registry</h1>
        <button onClick={() => setIsAdding(true)} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem' }}>
          <Users size={20}/> Add New Patient
        </button>
      </div>

      {/* Edit Requests */}
      {requests.length > 0 && (
        <div className="card glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--warning)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Users size={20}/> Suggested Edits ({requests.length})
          </h2>
          {requests.map(req => (
            <div key={req.id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', backgroundColor: 'var(--surface)' }}>
              <p><strong>Pharmacy:</strong> {req.pharmacies?.name} requested changes for Patient <strong>{req.patients?.name}</strong> ({req.patients?.phone})</p>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', listStyle: 'none' }}>
                {req.suggested_name && <li><strong>Name:</strong> <span style={{color:'var(--primary)'}}>{req.suggested_name}</span></li>}
                {req.suggested_phone && <li><strong>Phone:</strong> <span style={{color:'var(--primary)'}}>{req.suggested_phone}</span></li>}
                {req.suggested_town && <li><strong>Town:</strong> <span style={{color:'var(--primary)'}}>{req.suggested_town}</span></li>}
              </ul>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={() => resolveRequest(req, 'approved')} className="btn btn-secondary btn-sm"><Check size={16}/> Approve Registry Change</button>
                <button onClick={() => resolveRequest(req, 'rejected')} className="btn btn-outline btn-sm" style={{ color:'var(--danger)' }}><XIcon size={16}/> Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Table */}
      <div className="card glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input" 
            style={{ paddingLeft: '3rem' }} 
            placeholder="Search by name or phone..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Total: <strong>{totalCount}</strong> patients
        </div>
      </div>

      <div className="card glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '1rem' }}>Patient Name</th>
              <th style={{ padding: '1rem' }}>Phone #</th>
              <th style={{ padding: '1rem' }}>Town</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
            ) : patients.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No patients found.</td></tr>
            ) : (
              patients.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>{p.name} <small style={{color:'var(--text-muted)'}}>({p.relation || 'Self'})</small></td>
                  <td style={{ padding: '1rem' }}>{p.phone}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{p.town_name || '-'}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingPatient(p)} className="btn btn-outline btn-sm" style={{ padding: '0.4rem' }}><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete(p.id)} className="btn btn-outline btn-sm" style={{ padding: '0.4rem', color: 'var(--danger)' }}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', borderTop: '1px solid var(--border)' }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-outline btn-sm"><ChevronLeft size={16}/></button>
            <span style={{ fontSize: '0.875rem' }}>Page <strong>{page}</strong> of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm"><ChevronRight size={16}/></button>
          </div>
        )}
      </div>

      {/* MODALS */}
      {(isAdding || editingPatient) && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
            <button onClick={() => { setIsAdding(false); setEditingPatient(null); }} style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <XIcon size={24}/>
            </button>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{editingPatient ? 'Edit Patient Record' : 'Add New Patient'}</h2>
            <form onSubmit={editingPatient ? handleUpdate : handleCreate}>
              <div className="form-group">
                <label className="form-label">Patient Name</label>
                <input type="text" name="name" className="form-input" defaultValue={editingPatient?.name || ''} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone #</label>
                <input type="tel" name="phone" className="form-input" defaultValue={editingPatient?.phone || ''} required />
              </div>
              <div className="form-group">
                <label className="form-label">Relation (Optional)</label>
                <input type="text" name="relation" className="form-input" defaultValue={editingPatient?.relation || ''} placeholder="e.g. Self, Brother, Mother" />
              </div>
              <div className="form-group">
                <label className="form-label">Master Town Profile</label>
                <select name="town_id" className="form-select" defaultValue={editingPatient?.town_id || ''}>
                  <option value="">-- No Specific Town --</option>
                  {towns.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingPatient ? 'Update Record' : 'Create Record'}</button>
                <button type="button" onClick={() => { setIsAdding(false); setEditingPatient(null); }} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
