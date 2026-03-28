'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Store, Check, X, Search, Edit2, Trash2, User, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

export default function AdminPharmaciesPage() {
  const [loading, setLoading] = useState(true);
  const [pharmacies, setPharmacies] = useState([]);
  const [userRecords, setUserRecords] = useState([]);
  const [editRequests, setEditRequests] = useState([]);
  const [tab, setTab] = useState('list'); // 'list', 'users', 'requests'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Edit State
  const [editingPharm, setEditingPharm] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [towns, setTowns] = useState([]);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [page, searchQuery, tab]);

  const fetchData = async () => {
    setLoading(true);
    const { data: tData } = await supabase.from('towns').select('*').eq('is_active', true).order('name');
    setTowns(tData || []);

    if (tab === 'list') {
      let query = supabase.from('pharmacies').select('*, towns(name), app_users(email)', { count: 'exact' });
      if (searchQuery) query = query.ilike('name', `%${searchQuery}%`);
      const { data, count } = await query.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
      setPharmacies(data || []);
      setTotalCount(count || 0);
    } else if (tab === 'users') {
      let query = supabase.from('app_users').select('*', { count: 'exact' });
      if (searchQuery) query = query.ilike('email', `%${searchQuery}%`);
      const { data, count } = await query.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
      setUserRecords(data || []);
      setTotalCount(count || 0);
    } else if (tab === 'requests') {
      const { data } = await supabase.from('pharmacy_edit_requests').select('*, pharmacies(name, town_name), towns(name)').eq('status', 'pending');
      setEditRequests(data || []);
    }
    setLoading(false);
  };

  const resolveEditRequest = async (req, decision) => {
    if (decision === 'approved') {
      const updates = {};
      if (req.suggested_name) updates.name = req.suggested_name;
      if (req.suggested_phone) updates.phone = req.suggested_phone;
      if (req.suggested_town_id) {
        updates.town_id = req.suggested_town_id;
        updates.town_name = req.suggested_town_name;
      }
      await supabase.from('pharmacies').update(updates).eq('id', req.pharmacy_id);
    }
    await supabase.from('pharmacy_edit_requests').update({ status: decision }).eq('id', req.id);
    fetchData();
  };

  const updatePharmStatus = async (id, status) => {
    await supabase.from('pharmacies').update({ status }).eq('id', id);
    fetchData();
  };

  const handleDeletePharm = async (id, userId) => {
    if (confirm('CAUTION: Deleting a pharmacy will also delete the user account. Proceed?')) {
      await supabase.from('app_users').delete().eq('id', userId);
      fetchData();
    }
  };

  const handleUpdatePharm = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updates = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      town_id: formData.get('town_id'),
      town_name: towns.find(t => t.id === formData.get('town_id'))?.name || '',
      status: formData.get('status')
    };
    await supabase.from('pharmacies').update(updates).eq('id', editingPharm.id);
    setEditingPharm(null);
    fetchData();
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>Network Manager</h1>
        <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--surface-hover)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
          <button onClick={() => { setTab('list'); setPage(1); }} className={`btn btn-sm ${tab === 'list' ? 'btn-primary' : ''}`} style={{ border: 'none' }}>Pharmacies</button>
          <button onClick={() => { setTab('requests'); }} className={`btn btn-sm ${tab === 'requests' ? 'btn-primary' : ''}`} style={{ border: 'none', position: 'relative' }}>
            Profile Requests
            {editRequests.length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: 'var(--danger)', color: 'white', fontSize: '0.7rem', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{editRequests.length}</span>}
          </button>
          <button onClick={() => { setTab('users'); setPage(1); }} className={`btn btn-sm ${tab === 'users' ? 'btn-primary' : ''}`} style={{ border: 'none' }}>Logins</button>
        </div>
      </div>

      {tab !== 'requests' && (
        <div className="card glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="form-input" style={{ paddingLeft: '3rem' }} placeholder={`Search ${tab === 'list' ? 'pharmacies' : 'users'}...`} value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }} />
          </div>
        </div>
      )}

      {/* PHARMACY LIST TAB */}
      {tab === 'list' && (
        <div className="card glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
              <tr><th style={{ padding: '1rem' }}>Pharmacy</th><th style={{ padding: '1rem' }}>Town</th><th style={{ padding: '1rem' }}>Status</th><th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr> : pharmacies.length === 0 ? <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No records.</td></tr> : pharmacies.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}><div style={{ fontWeight: '600' }}>{item.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.app_users?.email}</div></td>
                  <td style={{ padding: '1rem' }}>{item.towns?.name || item.town_name || '-'}</td>
                  <td style={{ padding: '1rem' }}><span className={`badge badge-${item.status}`}>{item.status?.toUpperCase()}</span></td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}><div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>{item.status === 'pending' && <button onClick={() => updatePharmStatus(item.id, 'approved')} className="btn btn-secondary btn-sm"><Check size={14}/></button>}<button onClick={() => setEditingPharm(item)} className="btn btn-outline btn-sm"><Edit2 size={14}/></button><button onClick={() => handleDeletePharm(item.id, item.user_id)} className="btn btn-outline btn-sm" style={{ color: 'var(--danger)' }}><Trash2 size={14}/></button></div></td>
                </tr>
              ))}
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
      )}

      {/* PROFILE REQUESTS TAB */}
      {tab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {editRequests.length === 0 ? <p className="text-muted">No pending profile edit requests.</p> : editRequests.map(req => (
            <div key={req.id} className="card glass-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--warning)' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{req.pharmacies?.name} <small style={{color:'var(--text-muted)'}}>({req.pharmacies?.town_name})</small></h3>
                <div style={{ fontSize: '0.875rem' }}>
                  {req.suggested_name && <div style={{ marginBottom: '0.25rem' }}>Change Name to: <strong style={{color:'var(--primary)'}}>{req.suggested_name}</strong></div>}
                  {req.suggested_town_name && <div style={{ marginBottom: '0.25rem' }}>Transfer Town to: <strong style={{color:'var(--primary)'}}>{req.suggested_town_name}</strong></div>}
                  {req.suggested_phone && <div>Update Phone: <strong style={{color:'var(--primary)'}}>{req.suggested_phone}</strong></div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => resolveEditRequest(req, 'approved')} className="btn btn-secondary"><Check size={16} style={{marginRight: '0.5rem'}}/> Approve Change</button>
                <button onClick={() => resolveEditRequest(req, 'rejected')} className="btn btn-outline" style={{color:'var(--danger)'}}><X size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* USER LOGINS TAB */}
      {tab === 'users' && (
        <div className="card glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
              <tr><th style={{ padding: '1rem' }}>Login Email</th><th style={{ padding: '1rem' }}>Join Date</th><th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="3" style={{ padding: '3rem', textAlign: 'center' }}><Loader2 className="animate-spin" /></td></tr> : userRecords.length === 0 ? <tr><td colSpan="3" style={{ padding: '3rem', textAlign: 'center' }}>No users.</td></tr> : userRecords.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{u.email}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button onClick={() => setEditingUser(u)} className="btn btn-outline btn-sm"><Edit2 size={14}/> Edit Password</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODALS (Simplified for brevity as they remain largely same) */}
      {editingPharm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setEditingPharm(null)} style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24}/></button>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Admin Override: Pharmacy Profile</h2>
            <form onSubmit={handleUpdatePharm}>
              <div className="form-group"><label className="form-label">Live Name</label><input name="name" className="form-input" defaultValue={editingPharm.name} required /></div>
              <div className="form-group"><label className="form-label">Live Phone</label><input name="phone" className="form-input" defaultValue={editingPharm.phone} required /></div>
              <div className="form-group">
                <label className="form-label">Town</label>
                <select name="town_id" className="form-select" defaultValue={editingPharm.town_id || ''}>
                  {towns.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Network Status</label>
                <select name="status" className="form-select" defaultValue={editingPharm.status}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected / Inactive</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop:'1rem' }}>Force Update Profile</button>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setEditingUser(null)} style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24}/></button>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Login Account</h2>
            <form onSubmit={async (e) => { e.preventDefault(); alert('Password hashing requires Bcrypt. Use SQL Editor for MVP.'); }}>
              <div className="form-group"><label className="form-label">Login Email</label><input name="email" className="form-input" defaultValue={editingUser.email} /></div>
              <div className="form-group"><label className="form-label">New Password</label><input name="password" type="password" className="form-input" placeholder="••••••••" /></div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop:'1rem' }}>Apply Account Changes</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
