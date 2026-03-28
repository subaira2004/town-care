'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Edit2, Trash2, ChevronLeft, ChevronRight, Plus, X, Search } from 'lucide-react';

export default function AdminTownsPage() {
  const [loading, setLoading] = useState(true);
  const [towns, setTowns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Edit State
  const [editingTown, setEditingTown] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [page, searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from('towns').select('*', { count: 'exact' });
    
    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    const { data, count, error } = await query
      .order('name')
      .range((page - 1) * limit, page * limit - 1);

    if (!error) {
      setTowns(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('townName');
    const state = formData.get('townState');
    
    const { error } = await supabase.from('towns').insert([{ name, state }]);
    if (error) alert(error.message);
    else {
      setIsAdding(false);
      fetchData();
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('townName');
    const state = formData.get('townState');

    await supabase.from('towns').update({ name, state }).eq('id', editingTown.id);
    setEditingTown(null);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this town? This might affect existing pharmacies and patients.')) {
      await supabase.from('towns').delete().eq('id', id);
      fetchData();
    }
  };

  const toggleStatus = async (id, isActive) => {
    await supabase.from('towns').update({ is_active: !isActive }).eq('id', id);
    fetchData();
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>Master Towns</h1>
        <button onClick={() => setIsAdding(true)} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem' }}>
          <Plus size={20}/> Add Town
        </button>
      </div>

      {/* Search & Stats */}
      <div className="card glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input" 
            style={{ paddingLeft: '3rem' }} 
            placeholder="Search towns..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Total: <strong>{totalCount}</strong> towns
        </div>
      </div>

      {/* Table Content */}
      <div className="card glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>State</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
            ) : towns.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No towns found.</td></tr>
            ) : (
              towns.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>{t.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t.state || '-'}</td>
                  <td style={{ padding: '1rem' }}>
                    <button 
                      onClick={() => toggleStatus(t.id, t.is_active)}
                      style={{ 
                        border: 'none', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: 'var(--radius-full)', 
                        fontSize: '0.75rem', 
                        cursor: 'pointer',
                        backgroundColor: t.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: t.is_active ? 'var(--secondary)' : 'var(--danger)'
                      }}
                    >
                      {t.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingTown(t)} className="btn btn-outline btn-sm" style={{ padding: '0.4rem' }}><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete(t.id)} className="btn btn-outline btn-sm" style={{ padding: '0.4rem', color: 'var(--danger)' }}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', borderTop: '1px solid var(--border)' }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-outline btn-sm"><ChevronLeft size={16}/></button>
            <span style={{ fontSize: '0.875rem' }}>Page <strong>{page}</strong> of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm"><ChevronRight size={16}/></button>
          </div>
        )}
      </div>

      {/* MODALS */}
      {(isAdding || editingTown) && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
            <button onClick={() => { setIsAdding(false); setEditingTown(null); }} style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={24}/>
            </button>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{editingTown ? 'Edit Town' : 'Add New Town'}</h2>
            <form onSubmit={editingTown ? handleUpdate : handleCreate}>
              <div className="form-group">
                <label className="form-label">Town Name</label>
                <input type="text" name="townName" className="form-input" defaultValue={editingTown?.name || ''} required placeholder="e.g. Salem" />
              </div>
              <div className="form-group">
                <label className="form-label">State / Region (Optional)</label>
                <input type="text" name="townState" className="form-input" defaultValue={editingTown?.state || ''} placeholder="e.g. Tamil Nadu" />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingTown ? 'Update Town' : 'Create Town'}</button>
                <button type="button" onClick={() => { setIsAdding(false); setEditingTown(null); }} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
