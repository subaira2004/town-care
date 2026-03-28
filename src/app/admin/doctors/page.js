'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Search, Edit2, Trash2, ChevronLeft, ChevronRight, Plus, X, HeartPulse, Check, X as XIcon } from 'lucide-react';

export default function AdminDoctorsPage() {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Edit / Add Modal
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [page, searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Fetch Edit Requests (Show all)
    const { data: rData } = await supabase.from('doctor_edit_requests')
      .select('*, doctors(name), pharmacies(name)')
      .eq('status', 'pending');
    setRequests(rData || []);

    // 2. Fetch Master Registry (Paginated)
    let query = supabase.from('doctors').select('*', { count: 'exact' });
    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    const { data, count, error } = await query
      .order('name')
      .range((page - 1) * limit, page * limit - 1);

    if (!error) {
      setDoctors(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const resolveRequest = async (req, decision) => {
    if (decision === 'approved') {
      const updates = {};
      if (req.suggested_name) updates.name = req.suggested_name;
      if (req.suggested_specialty) updates.specialty = req.suggested_specialty;
      if (req.suggested_phone) updates.phone = req.suggested_phone;
      await supabase.from('doctors').update(updates).eq('id', req.doctor_id);
    }
    await supabase.from('doctor_edit_requests').update({ status: decision }).eq('id', req.id);
    fetchData();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updates = {
      name: formData.get('name'),
      specialty: formData.get('specialty'),
      phone: formData.get('phone'),
      notes: formData.get('notes')
    };
    
    await supabase.from('doctors').insert([updates]);
    setIsAdding(false);
    fetchData();
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updates = {
      name: formData.get('name'),
      specialty: formData.get('specialty'),
      phone: formData.get('phone'),
      notes: formData.get('notes')
    };

    await supabase.from('doctors').update(updates).eq('id', editingDoctor.id);
    setEditingDoctor(null);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure? Deleting a doctor will remove them from all registered pharmacies!')) {
      await supabase.from('doctors').delete().eq('id', id);
      fetchData();
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>Doctor Registry</h1>
        <button onClick={() => setIsAdding(true)} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem' }}>
          <Plus size={20}/> Add New Doctor
        </button>
      </div>

      {/* Edit Requests (At the Top) */}
      {requests.length > 0 && (
        <div className="card glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--warning)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <HeartPulse size={20}/> Suggested Edits ({requests.length})
          </h2>
          {requests.map(req => (
            <div key={req.id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', backgroundColor: 'var(--surface)' }}>
              <p><strong>Pharmacy:</strong> {req.pharmacies?.name} requested changes for <strong>Dr. {req.doctors?.name}</strong></p>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', listStyle: 'none' }}>
                {req.suggested_name && <li><strong>Name:</strong> <span style={{color:'var(--primary)'}}>{req.suggested_name}</span></li>}
                {req.suggested_specialty && <li><strong>Specialty:</strong> <span style={{color:'var(--primary)'}}>{req.suggested_specialty}</span></li>}
                {req.suggested_phone && <li><strong>Phone:</strong> <span style={{color:'var(--primary)'}}>{req.suggested_phone}</span></li>}
              </ul>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={() => resolveRequest(req, 'approved')} className="btn btn-secondary btn-sm"><Check size={16}/> Approve Registry Change</button>
                <button onClick={() => resolveRequest(req, 'rejected')} className="btn btn-outline btn-sm" style={{ color:'var(--danger)' }}><XIcon size={16}/> Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Registry Table */}
      <div className="card glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input" 
            style={{ paddingLeft: '3rem' }} 
            placeholder="Search doctors by name..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Total: <strong>{totalCount}</strong> doctors
        </div>
      </div>

      <div className="card glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>Specialty</th>
              <th style={{ padding: '1rem' }}>Phone</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
            ) : doctors.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No doctors found in master database.</td></tr>
            ) : (
              doctors.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>Dr. {d.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{d.specialty || '-'}</td>
                  <td style={{ padding: '1rem' }}>{d.phone || '-'}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingDoctor(d)} className="btn btn-outline btn-sm" style={{ padding: '0.4rem' }}><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete(d.id)} className="btn btn-outline btn-sm" style={{ padding: '0.4rem', color: 'var(--danger)' }}><Trash2 size={16}/></button>
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
      {(isAdding || editingDoctor) && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
            <button onClick={() => { setIsAdding(false); setEditingDoctor(null); }} style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <XIcon size={24}/>
            </button>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{editingDoctor ? 'Edit Doctor Master Record' : 'Add New Master Doctor'}</h2>
            <form onSubmit={editingDoctor ? handleUpdate : handleCreate}>
              <div className="form-group">
                <label className="form-label">Doctor Name</label>
                <div style={{ display:'flex', alignItems:'center', gap: '0.5rem' }}>
                  <span style={{color:'var(--text-muted)', fontWeight:600}}>Dr.</span>
                  <input type="text" name="name" className="form-input" defaultValue={editingDoctor?.name || ''} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Specialty</label>
                <input type="text" name="specialty" className="form-input" defaultValue={editingDoctor?.specialty || ''} placeholder="e.g. Cardiologist" />
              </div>
              <div className="form-group">
                <label className="form-label">Global Phone (Optional)</label>
                <input type="tel" name="phone" className="form-input" defaultValue={editingDoctor?.phone || ''} placeholder="e.g. +91 9876543210" />
              </div>
              <div className="form-group">
                <label className="form-label">Registry Notes</label>
                <textarea name="notes" className="form-input" defaultValue={editingDoctor?.notes || ''} style={{minHeight:'80px'}}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingDoctor ? 'Update Registry' : 'Add to Registry'}</button>
                <button type="button" onClick={() => { setIsAdding(false); setEditingDoctor(null); }} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
