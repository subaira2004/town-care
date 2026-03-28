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
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "var(--background)",
        }}
      >
        <div
          className="card glass-panel"
          style={{ maxWidth: "500px", padding: "3rem" }}
        >
          <Activity
            size={64}
            color={
              pharmStatus === "rejected" ? "var(--danger)" : "var(--warning)"
            }
            style={{ margin: "0 auto 1.5rem auto" }}
          />
          <h1
            style={{
              fontSize: "1.75rem",
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
            }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "var(--background)",
      }}
    >
      {/* Mobile Toggle */}
      <div
        style={{
          display: "block",
          position: "fixed",
          top: "1rem",
          left: "1rem",
          zIndex: 50,
        }}
        className="md-hidden"
      >
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="btn btn-outline"
          style={{ padding: "0.5rem", backgroundColor: "var(--surface)" }}
        >
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        style={{
          width: "260px",
          backgroundColor: "var(--surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
          zIndex: 40,
          "@media (minWidth: 768px)": {
            transform: "translateX(0)",
            position: "sticky",
          },
        }}
        className="sidebar-container"
      >
        <div
          style={{
            padding: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            borderBottom: "1px solid var(--border)",
            height: "70px",
          }}
        >
          <Activity size={28} color="var(--primary)" />
          <span
            style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              color: "var(--text-main)",
            }}
          >
            Town Care
          </span>
        </div>

        <nav
          style={{
            flex: 1,
            padding: "1.5rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {menuItems.map((item) => {
            const isActive =
              pathname === item.path ||
              (pathname.startsWith(item.path) && item.path !== "/dashboard");
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.875rem 1rem",
                  borderRadius: "var(--radius-md)",
                  color: isActive ? "var(--primary)" : "var(--text-muted)",
                  backgroundColor: isActive
                    ? "rgba(79, 70, 229, 0.1)"
                    : "transparent",
                  fontWeight: isActive ? "600" : "500",
                  transition: "background-color 0.2s, color 0.2s",
                  textDecoration: "none",
                }}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "1rem", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "0.875rem 1rem",
              width: "100%",
              borderRadius: "var(--radius-md)",
              color: "var(--danger)",
              backgroundColor: "transparent",
              border: "none",
              fontWeight: "500",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          padding: "2rem",
          marginLeft: "0",
          // inline styles for standard css, we should ideally use normal css classes for media queries
          // but simple styles work for this project.
        }}
        className="main-content"
      >
        <div
          className="container"
          style={{ maxWidth: "1200px", margin: "0 auto", paddingTop: "3rem" }}
        >
          {children}
        </div>
      </main>

      <style jsx global>{`
        @media (min-width: 768px) {
          .md-hidden {
            display: none !important;
          }
          .sidebar-container {
            transform: translateX(0) !important;
            position: sticky !important;
          }
          .main-content {
            padding-top: 2rem !important;
          }
        }
        @media (max-width: 767px) {
          .main-content {
            padding-top: 4rem !important;
            margin-left: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
