'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signupAction, getTowns } from '@/app/actions/auth';
import Link from 'next/link';
import { Activity, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [townId, setTownId] = useState('');
  const [townName, setTownName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [towns, setTowns] = useState([]);
  const router = useRouter();


  useEffect(() => {
    async function loadTowns() {
      const data = await getTowns();
      setTowns(data || []);
    }
    loadTowns();
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.target);
    const { error, success } = await signupAction(formData);

    if (error) {
      setError(error);
      setLoading(false);
    } else if (success) {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
          <Activity size={48} />
        </div>
        <h1 style={{ textAlign: 'center', fontSize: '1.75rem', marginBottom: '0.5rem' }}>Create Pharmacy Profile</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>Get started with Town Care today.</p>
        
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Pharmacy Name</label>
            <input id="name" name="name" type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Town Medicals" />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="town_id">Town / City</label>
              <select 
                id="town_id" 
                name="town_id" 
                className="form-select" 
                value={townId} 
                onChange={(e) => {
                  setTownId(e.target.value);
                  const selected = towns.find(t => t.id === e.target.value);
                  if (selected) setTownName(selected.name);
                }} 
                required
              >
                <option value="" disabled>Select Town</option>
                {towns.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <input type="hidden" name="town_name" value={townName} />
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="phone">Phone Number</label>
              <input id="phone" name="phone" type="tel" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+91 9876543210" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input id="email" name="email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="pharmacy@example.com" />
          </div>

          <div className="form-group" style={{ marginBottom: '2.5rem' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength="6" />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Already have an account? <Link href="/login" style={{ fontWeight: '600' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
