'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, LayoutDashboard, HeartPulse, CalendarCheck, Users, Settings, LogOut, Menu, X } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
    router.refresh();
  };

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20}/>, path: '/dashboard' },
    { name: 'Doctors', icon: <HeartPulse size={20}/>, path: '/dashboard/doctors' },
    { name: 'Schedules', icon: <CalendarCheck size={20}/>, path: '/dashboard/schedules' },
    { name: 'Token Queue', icon: <Users size={20}/>, path: '/dashboard/queue' },
    { name: 'Settings', icon: <Settings size={20}/>, path: '/dashboard/settings' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      {/* Mobile Toggle */}
      <div style={{ display: 'block', position: 'fixed', top: '1rem', left: '1rem', zIndex: 50 }} className="md-hidden">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="btn btn-outline" style={{ padding: '0.5rem', backgroundColor: 'var(--surface)' }}>
          {isSidebarOpen ? <X/> : <Menu/>}
        </button>
      </div>

      {/* Sidebar */}
      <aside style={{
        width: '260px',
        backgroundColor: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        zIndex: 40,
        '@media (minWidth: 768px)': { transform: 'translateX(0)', position: 'sticky' }
      }} className="sidebar-container">
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', height: '70px' }}>
          <Activity size={28} color="var(--primary)" />
          <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>Town Care</span>
        </div>
        
        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== '/dashboard');
            return (
              <Link 
                key={item.name} 
                href={item.path}
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                  fontWeight: isActive ? '600' : '500',
                  transition: 'background-color 0.2s, color 0.2s',
                  textDecoration: 'none'
                }}
              >
                {item.icon}
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <button 
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.875rem 1rem',
              width: '100%',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              backgroundColor: 'transparent',
              border: 'none',
              fontWeight: '500',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <LogOut size={20}/>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', marginLeft: '0', 
         // inline styles for standard css, we should ideally use normal css classes for media queries
         // but simple styles work for this project.
      }} className="main-content">
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '3rem' }}>
          {children}
        </div>
      </main>

      <style jsx global>{`
        @media (min-width: 768px) {
          .md-hidden { display: none !important; }
          .sidebar-container { transform: translateX(0) !important; position: sticky !important; }
          .main-content { padding-top: 2rem !important; }
        }
        @media (max-width: 767px) {
          .main-content { padding-top: 4rem !important; margin-left: auto !important; }
        }
      `}</style>
    </div>
  );
}
