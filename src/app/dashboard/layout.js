"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  HeartPulse,
  CalendarCheck,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pharmStatus, setPharmStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function checkSecurity() {
      const { getAuthUser } = await import("@/app/actions/auth");
      const user = await getAuthUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const supabase = createClient();
      const { data: pData } = await supabase
        .from("pharmacies")
        .select("status")
        .eq("user_id", user.id)
        .single();
      if (pData) {
        setPharmStatus(pData.status);
      }
      setLoading(false);
    }
    checkSecurity();
  }, [router]);

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  const menuItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/dashboard",
    },
    {
      name: "Analytics",
      icon: <BarChart3 size={20} />,
      path: "/dashboard/analytics",
    },
    {
      name: "Doctors",
      icon: <HeartPulse size={20} />,
      path: "/dashboard/doctors",
    },
    {
      name: "Schedules",
      icon: <CalendarCheck size={20} />,
      path: "/dashboard/schedules",
    },
    {
      name: "Token Queue",
      icon: <Users size={20} />,
      path: "/dashboard/queue",
    },
    {
      name: "Settings",
      icon: <Settings size={20} />,
      path: "/dashboard/settings",
    },
  ];

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          height: "100vh",
          alignItems: "center",
        }}
      >
        <Activity className="animate-pulse" size={48} color="var(--primary)" />
      </div>
    );

  if (pharmStatus !== "approved") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          textAlign: "center",
          backgroundColor: "var(--background)",
        }}
      >
        <div
          className="card glass-panel"
          style={{ maxWidth: "500px", padding: "2rem" }}
        >
          <Activity
            size={56}
            color={
              pharmStatus === "rejected" ? "var(--danger)" : "var(--warning)"
            }
            style={{ margin: "0 auto 1.5rem auto" }}
          />
          <h1
            style={{
              fontSize: "1.5rem",
              marginBottom: "1rem",
              color: "var(--text-main)",
            }}
          >
            {pharmStatus === "rejected"
              ? "Account Deactivated"
              : "Approval Pending"}
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              marginBottom: "2rem",
              lineHeight: 1.6,
              fontSize: "0.9rem",
            }}
          >
            {pharmStatus === "rejected"
              ? "Your pharmacy account has been deactivated by the platform owner. Please contact support if you believe this is an error."
              : "Your pharmacy account is currently under review by the Platform Owner. Once approved, you will have full access to manage your queue."}
          </p>
          <button
            onClick={handleLogout}
            className="btn btn-outline"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              fontSize: "0.9rem",
            }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Mobile Toggle */}
      <button
        className="mobile-menu-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label="Toggle menu"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Overlay (mobile) */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar-container ${isSidebarOpen ? "sidebar-open" : ""}`}
      >
        <div className="sidebar-header">
          <Activity size={28} color="var(--primary)" />
          <span className="sidebar-title">Town Care</span>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.path ||
              (pathname.startsWith(item.path) && item.path !== "/dashboard");
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`sidebar-nav-item ${isActive ? "active" : ""}`}
              >
                {item.icon}
                <span className="nav-item-text">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-logout-btn">
            <LogOut size={20} />
            <span className="nav-item-text">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
