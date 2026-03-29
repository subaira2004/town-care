"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  Store,
  MapPin,
  HeartPulse,
  Users,
  LogOut,
  Menu,
  X,
  BarChart3,
  CreditCard,
  FileText,
  DollarSign,
  Settings,
} from "lucide-react";
import { adminLogoutAction, getAdminUser } from "@/app/actions/auth";

export default function AdminLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  // Don't apply layout to login page
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }
    async function checkAdmin() {
      const adm = await getAdminUser();
      if (!adm) {
        router.push("/admin/login");
        return;
      }
      setAdmin(adm);
      setLoading(false);
    }
    checkAdmin();
  }, [router, isLoginPage]);

  if (isLoginPage) return <>{children}</>;

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
        <Shield className="animate-pulse" size={48} color="var(--primary)" />
      </div>
    );

  const handleLogout = async () => {
    await adminLogoutAction();
    router.push("/admin/login");
    router.refresh();
  };

  const [expandedMenu, setExpandedMenu] = useState(null);

  const menuItems = [
    { name: "Pharmacies", icon: <Store size={20} />, path: "/admin" },
    {
      name: "Analytics",
      icon: <BarChart3 size={20} />,
      path: "/admin/analytics",
    },
    {
      name: "Subscriptions",
      icon: <CreditCard size={20} />,
      path: "#",
      submenu: [
        {
          name: "Plans",
          icon: <Settings size={16} />,
          path: "/admin/subscriptions/plans",
        },
        {
          name: "Pharmacies",
          icon: <Store size={16} />,
          path: "/admin/subscriptions/pharmacies",
        },
        {
          name: "Invoices",
          icon: <FileText size={16} />,
          path: "/admin/subscriptions/invoices",
        },
        {
          name: "Revenue",
          icon: <DollarSign size={16} />,
          path: "/admin/subscriptions/revenue",
        },
      ],
    },
    { name: "Master Towns", icon: <MapPin size={20} />, path: "/admin/towns" },
    { name: "Doctors", icon: <HeartPulse size={20} />, path: "/admin/doctors" },
    { name: "Patients", icon: <Users size={20} />, path: "/admin/patients" },
  ];

  return (
    <div className="admin-layout">
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
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar-container ${isSidebarOpen ? "sidebar-open" : ""}`}
      >
        <div className="sidebar-header">
          <Shield size={28} color="var(--primary)" />
          <div className="sidebar-brand">
            <span className="sidebar-title">Town Care</span>
            <span className="sidebar-subtitle">ADMIN CONSOLE</span>
          </div>
          {/* Close button for mobile */}
          <button
            className="sidebar-close-btn"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const isExpanded = expandedMenu === item.name;
            const hasSubmenu = item.submenu && item.submenu.length > 0;

            if (hasSubmenu) {
              return (
                <div key={item.name}>
                  <button
                    onClick={() =>
                      setExpandedMenu(isExpanded ? null : item.name)
                    }
                    className={`sidebar-nav-item ${isExpanded ? "active" : ""}`}
                    style={{
                      width: "100%",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      color: "inherit",
                    }}
                  >
                    {item.icon}
                    <span
                      className="nav-item-text"
                      style={{ flex: 1, textAlign: "left" }}
                    >
                      {item.name}
                    </span>
                    <span style={{ fontSize: "0.75rem" }}>
                      {isExpanded ? "▼" : "▶"}
                    </span>
                  </button>
                  {isExpanded && (
                    <div
                      style={{
                        paddingLeft: "2.75rem",
                        paddingTop: "0.5rem",
                        paddingBottom: "0.5rem",
                      }}
                    >
                      {item.submenu.map((subItem) => {
                        const isSubActive = pathname === subItem.path;
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.path}
                            onClick={() => setIsSidebarOpen(false)}
                            className={`sidebar-nav-item ${isSubActive ? "active" : ""}`}
                            style={{
                              fontSize: "0.875rem",
                              padding: "0.5rem 0.75rem",
                            }}
                          >
                            {subItem.icon}
                            <span className="nav-item-text">
                              {subItem.name}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

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
          <p className="admin-email">{admin?.email}</p>
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
