"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Calendar,
  Users,
  ArrowRight,
  Play,
  CheckCircle2,
  Clock,
  Plus,
  Phone,
} from "lucide-react";
import { getTodayDate } from "@/lib/utils";
import { getAuthUser } from "@/app/actions/auth";
import { t } from "@/lib/i18n/translations";
import Link from "next/link";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [pharmacy, setPharmacy] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const user = await getAuthUser();
    if (!user) return;

    const { data: pData } = await supabase
      .from("pharmacies")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (pData) {
      setPharmacy(pData);
      const today = getTodayDate();
      const { data: scheds } = await supabase
        .from("schedules")
        .select(
          `*, doctors(name, specialty), tokens(id, token_number, status, patients(name, phone))`,
        )
        .eq("pharmacy_id", pData.id)
        .eq("schedule_date", today);
      setActiveSessions(scheds || []);
    }
    setLoading(false);
  };

  const updateStatus = async (tokenId, newStatus) => {
    await supabase
      .from("tokens")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", tokenId);
    fetchDashboardData();
  };

  const pref = pharmacy?.language || "en";

  if (loading)
    return (
      <div
        style={{ display: "flex", justifyContent: "center", marginTop: "4rem" }}
      >
        <Loader2 className="animate-spin" color="var(--primary)" size={32} />
      </div>
    );

  return (
    <div
      className="animate-fade-in dashboard-page"
      style={{ paddingBottom: "4rem" }}
    >
      <div className="dashboard-header" style={{ marginBottom: "2rem" }}>
        <h1 className="pharmacy-name">{pharmacy?.name}</h1>
        <div className="dashboard-date">
          <Calendar size={20} color="var(--primary)" />
          <span>
            {new Date().toLocaleDateString(pref === "ta" ? "ta-IN" : "en-IN", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="sessions-section">
        {activeSessions.length === 0 ? (
          <div
            className="card glass-panel"
            style={{
              padding: "3rem 1.5rem",
              textAlign: "center",
            }}
          >
            <Calendar
              size={56}
              style={{
                opacity: 0.1,
                margin: "0 auto 1.5rem",
                color: "var(--text-main)",
              }}
            />
            <h2
              style={{
                fontSize: "1.25rem",
                color: "var(--text-main)",
                marginBottom: "1.5rem",
              }}
            >
              {t("noSchedulesToday", pref)}
            </h2>
            <Link href="/dashboard/schedules" className="btn btn-primary">
              {t("addSchedule", pref)}
            </Link>
          </div>
        ) : (
          <div className="card glass-panel sessions-table-container">
            {/* Table Header - Hidden on mobile */}
            <div className="table-header">
              <div>Doctor</div>
              <div>Status</div>
              <div>Current Token</div>
              <div>Next Token</div>
              <div>Waiting</div>
              <div>Actions</div>
            </div>

            {/* Table Body */}
            <div className="table-body">
              {activeSessions.map((session, index) => {
                const waiting =
                  session.tokens?.filter((t) => t.status === "waiting") || [];
                const active = session.tokens?.find(
                  (t) => t.status === "in_consultation",
                );
                const completed =
                  session.tokens?.filter((t) => t.status === "completed") || [];

                return (
                  <div key={session.id} className="table-row animate-fade-in">
                    {/* Doctor */}
                    <div className="table-cell doctor-cell">
                      <div className="doctor-name">
                        Dr. {session.doctors?.name}
                      </div>
                      <div className="doctor-specialty">
                        {session.doctors?.specialty || t("none", pref)}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="table-cell status-cell">
                      <div
                        className={`badge badge-${
                          active ? "active" : "waiting"
                        }`}
                      >
                        {active ? t("liveSession", pref) : t("offline", pref)}
                      </div>
                    </div>

                    {/* Current Token */}
                    <div className="table-cell current-token-cell">
                      {active ? (
                        <div className="token-info">
                          <div className="token-badge current">
                            {active.token_number}
                          </div>
                          <div className="token-details">
                            <div className="token-label">
                              {t("insideWithDoctor", pref)}
                            </div>
                            <div className="token-patient-name">
                              {active.patients?.name}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="waiting-text">
                          {t("waiting", pref)}...
                        </div>
                      )}
                    </div>

                    {/* Next Token */}
                    <div className="table-cell next-token-cell">
                      {waiting.length > 0 ? (
                        <div className="token-info">
                          <div className="token-badge next">
                            {waiting[0].token_number}
                          </div>
                          <div className="token-patient-name">
                            {waiting[0].patients?.name}
                          </div>
                        </div>
                      ) : (
                        <div className="waiting-text">--</div>
                      )}
                    </div>

                    {/* Waiting Count */}
                    <div className="table-cell waiting-cell">
                      <div className="waiting-count">{waiting.length}</div>
                      <div className="waiting-label">
                        {t("waitingPatients", pref)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="table-cell actions-cell">
                      <div className="actions-group">
                        {!active && waiting.length > 0 && (
                          <button
                            onClick={() =>
                              updateStatus(waiting[0].id, "in_consultation")
                            }
                            className="btn btn-primary btn-sm"
                            title={t("startConsultation", pref)}
                          >
                            <Play size={16} />
                          </button>
                        )}
                        {active && (
                          <button
                            onClick={() => updateStatus(active.id, "completed")}
                            className="btn btn-secondary btn-sm"
                            title={t("completeToken", pref)}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        <Link
                          href={`/dashboard/queue?schedule=${session.id}`}
                          className="btn btn-outline btn-sm"
                        >
                          {t("manageQueue", pref)}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="quick-shortcuts" style={{ marginTop: "3rem" }}>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 900,
            color: "var(--text-main)",
            marginBottom: "1.5rem",
          }}
        >
          {t("quickShortcuts", pref)}
        </h2>
        <div className="shortcuts-grid">
          <Link
            href="/dashboard/queue"
            className="card glass-panel shortcut-card"
          >
            <div className="shortcut-icon">
              <Users size={32} color="var(--primary)" />
            </div>
            <span className="shortcut-label">
              {t("issueToken", pref).toUpperCase()}
            </span>
          </Link>
          <Link
            href="/dashboard/schedules"
            className="card glass-panel shortcut-card"
          >
            <div className="shortcut-icon secondary">
              <Calendar size={32} color="var(--secondary)" />
            </div>
            <span className="shortcut-label">
              {t("planSessions", pref).toUpperCase()}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
