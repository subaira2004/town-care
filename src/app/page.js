import Link from 'next/link';
import { ArrowRight, Activity, CalendarCheck, Users } from 'lucide-react';
import '../app/globals.css';

export default function LandingPage() {
  return (
    <div className="landing-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="header glass-panel" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem', borderRadius: 'var(--radius-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', fontSize: '1.25rem', color: 'var(--primary)' }}>
          <Activity size={24} />
          Town Care
        </div>
        <div>
          <Link href="/login" className="btn btn-outline" style={{ marginRight: '1rem' }}>Login</Link>
          <Link href="/signup" className="btn btn-primary">Try for Free <ArrowRight size={16}/></Link>
        </div>
      </header>
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', textAlign: 'center' }}>
        <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
          <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', fontWeight: '800', lineHeight: 1.1, background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Goodbye Notebooks.<br/>Hello Digital Queue.
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
            The simplest web app for pharmacies to manage visiting doctors and patient tokens without the complexity of hospital software.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '4rem' }}>
            <Link href="/signup" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1.125rem' }}>
              Start Now - It's Free
            </Link>
            <Link href="/login" className="btn btn-outline" style={{ padding: '0.875rem 2rem', fontSize: '1.125rem' }}>
              Pharmacy Login
            </Link>
          </div>

          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { icon: <CalendarCheck size={32}/>, title: 'Simple Schedules', desc: 'No complex booking rules. Just assign doctors to days.' },
              { icon: <Users size={32}/>, title: 'Live Tokens', desc: 'Share a live waiting link so patients stop calling you.' },
              { icon: <Activity size={32}/>, title: 'Phone Based', desc: 'Search repeat patients instantly by their phone number.' }
            ].map((feature, i) => (
              <div key={i} className="card" style={{ flex: '1 1 250px', maxWidth: '300px', textAlign: 'left', animationDelay: `${i * 0.1}s` }}>
                <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}>{feature.icon}</div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{feature.title}</h3>
                <p style={{ color: 'var(--text-muted)' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
        <p>© 2026 Town Care. Built for modern local pharmacies.</p>
      </footer>
    </div>
  );
}
