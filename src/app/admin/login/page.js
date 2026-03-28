'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLoginAction } from '@/app/actions/auth';
import { Activity, Loader2, Shield } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.target);
    const result = await adminLoginAction(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.success) {
      router.push('/admin');
      router.refresh();
    }
  };

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', backgroundColor: 'var(--background)' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', border: '2px solid var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={32} color="white" />
          </div>
        </div>
        <h1 style={{ textAlign: 'center', fontSize: '1.5rem', marginBottom: '0.25rem' }}>Platform Admin</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>Town Care – Owner Console</p>
        
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Admin Email</label>
            <input id="email" name="email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@towncare.in" />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In as Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
