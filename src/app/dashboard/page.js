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
  AlertCircle,
} from "lucide-react";
import { getTodayDate } from "@/lib/utils";
import { getAuthUser } from "@/app/actions/auth";
import { t } from "@/lib/i18n/translations";
import Link from "next/link";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [pharmacy, setPharmacy] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [delayMinutes, setDelayMinutes] = useState("");

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

  const handleDelayDoctor = (session) => {
    setSelectedSession(session);
    setDelayMinutes(session.delay_minutes || 0);
    setShowDelayModal(true);
  };

  const submitDelay = async () => {
    if (!selectedSession) return;
    await supabase
      .from("schedules")
      .update({ delay_minutes: parseInt(delayMinutes) || 0 })
      .eq("id", selectedSession.id);
    setShowDelayModal(false);
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
    <div className="animate-fade-in" style={{ paddingBottom: "4rem" }}>
      <div style={{ marginBottom: "3rem" }}>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: "900",
            color: "var(--text-main)",
            marginBottom: "0.5rem",
          }}
        >
          {pharmacy?.name}
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--text-muted)",
            fontSize: "1.1rem",
          }}
        >
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "2.5rem",
        }}
      >
        {activeSessions.length === 0 ? (
          <div
            className="card glass-panel"
            style={{
              gridColumn: "1 / -1",
              padding: "5rem",
              textAlign: "center",
            }}
          >
            <Calendar
              size={64}
              style={{
                opacity: 0.1,
                margin: "0 auto 1.5rem",
                color: "var(--text-main)",
              }}
            />
            <h2
              style={{
                fontSize: "1.5rem",
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
          activeSessions.map((session) => {
            const waiting =
              session.tokens?.filter((t) => t.status === "waiting") || [];
            const active = session.tokens?.find(
              (t) => t.status === "in_consultation",
            );
            const hasWaiting = waiting.length > 0;

            return (
              <div
                key={session.id}
                className="card glass-panel animate-fade-in"
                style={{
                  padding: "0",
                  overflow: "hidden",
                  border: active
                    ? "1px solid var(--secondary)"
                    : "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    padding: "1.75rem",
                    backgroundColor: "var(--background)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: 800,
                          color: "var(--text-main)",
                          margin: 0,
                        }}
                      >
                        Dr. {session.doctors?.name}
                      </h3>
                      <span
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.875rem",
                          fontWeight: 600,
                        }}
                      >
                        {session.doctors?.specialty || t("none", pref)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      {session.delay_minutes > 0 && (
                        <div
                          className="badge"
                          style={{
                            backgroundColor: "var(--warning)",
                            color: "white",
                            fontWeight: 800,
                          }}
                        >
                          +{session.delay_minutes}m delay
                        </div>
                      )}
                      <button
                        onClick={() => handleDelayDoctor(session)}
                        className="btn btn-outline btn-sm"
                        style={{
                          padding: "0.5rem 0.75rem",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                        title={t("delayDoctor", pref)}
                      >
                        <AlertCircle size={14} /> {t("delayDoctor", pref)}
                      </button>
                      <div
                        className="badge badge-active"
                        style={{
                          backgroundColor: active
                            ? "var(--secondary)"
                            : "var(--surface-hover)",
                          color: active ? "white" : "var(--text-muted)",
                          fontWeight: 800,
                        }}
                      >
                        {active ? t("liveSession", pref) : t("offline", pref)}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: "1.75rem" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.25rem",
                      marginBottom: "2rem",
                    }}
                  >
                    {/* CURRENT PATIENT */}
                    <div
                      style={{
                        padding: "1.25rem",
                        borderRadius: "1rem",
                        border: "1px solid var(--border)",
                        backgroundColor: active
                          ? "rgba(16, 185, 129, 0.05)"
                          : "var(--surface)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: active
                            ? "var(--secondary)"
                            : "var(--text-muted)",
                          fontWeight: 800,
                          letterSpacing: "0.1em",
                          marginBottom: "0.75rem",
                        }}
                      >
                        {t("insideWithDoctor", pref).toUpperCase()}
                      </div>
                      {active ? (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "1rem",
                            }}
                          >
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                backgroundColor: "var(--secondary)",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "800",
                              }}
                            >
                              {active.token_number}
                            </div>
                            <div>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: "1.25rem",
                                  color: "var(--text-main)",
                                }}
                              >
                                {active.patients?.name}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.8rem",
                                  color: "var(--text-muted)",
                                  fontWeight: 600,
                                }}
                              >
                                {active.patients?.phone}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => updateStatus(active.id, "completed")}
                            className="btn btn-secondary shadow-sm"
                            style={{ padding: "0.6rem" }}
                            title={t("completeToken", pref)}
                          >
                            <CheckCircle2 size={22} />
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.9rem",
                            fontStyle: "italic",
                          }}
                        >
                          {t("waiting", pref)}...
                        </div>
                      )}
                    </div>

                    {/* NEXT PATIENT */}
                    <div
                      style={{
                        padding: "1.25rem",
                        borderRadius: "1rem",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--surface)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--primary)",
                          fontWeight: 800,
                          letterSpacing: "0.1em",
                          marginBottom: "0.75rem",
                        }}
                      >
                        {t("nextPatient", pref).toUpperCase()}
                      </div>
                      {hasWaiting ? (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "1rem",
                            }}
                          >
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "800",
                              }}
                            >
                              {waiting[0].token_number}
                            </div>
                            <div>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: "1.25rem",
                                  color: "var(--text-main)",
                                }}
                              >
                                {waiting[0].patients?.name}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.8rem",
                                  color: "var(--text-muted)",
                                  fontWeight: 600,
                                }}
                              >
                                {waiting[0].patients?.phone}
                              </div>
                            </div>
                          </div>
                          {!active && (
                            <button
                              onClick={() =>
                                updateStatus(waiting[0].id, "in_consultation")
                              }
                              className="btn btn-primary"
                              style={{ padding: "0.6rem" }}
                              title={t("startConsultation", pref)}
                            >
                              <Play size={22} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.9rem",
                            fontStyle: "italic",
                          }}
                        >
                          {t("noTokens", pref)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px solid var(--border)",
                      paddingTop: "1.5rem",
                    }}
                  >
                    <div style={{ display: "flex", gap: "2rem" }}>
                      <div>
                        <div
                          style={{
                            fontSize: "1.5rem",
                            fontWeight: 900,
                            color: "var(--text-main)",
                          }}
                        >
                          {waiting.length}
                        </div>
                        <div
                          style={{
                            fontSize: "0.65rem",
                            color: "var(--text-muted)",
                            fontWeight: 800,
                          }}
                        >
                          {t("waitingPatients", pref).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: "1.5rem",
                            fontWeight: 900,
                            color: "var(--text-main)",
                          }}
                        >
                          {session.tokens?.filter(
                            (t) => t.status === "completed",
                          ).length || 0}
                        </div>
                        <div
                          style={{
                            fontSize: "0.65rem",
                            color: "var(--text-muted)",
                            fontWeight: 800,
                          }}
                        >
                          {t("visited", pref).toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/queue?schedule=${session.id}`}
                      className="btn btn-outline btn-sm"
                      style={{
                        fontWeight: 700,
                        borderRadius: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      {t("manageQueue", pref).toUpperCase()}{" "}
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: "5rem" }}>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 900,
            color: "var(--text-main)",
            marginBottom: "2rem",
          }}
        >
          {t("quickShortcuts", pref)}
        </h2>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <Link
            href="/dashboard/queue"
            className="card glass-panel"
            style={{
              flex: "1 1 250px",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(79, 70, 229, 0.1)",
                padding: "1rem",
                borderRadius: "1rem",
              }}
            >
              <Users size={32} color="var(--primary)" />
            </div>
            <span
              style={{
                fontWeight: 800,
                color: "var(--text-main)",
                fontSize: "1.1rem",
              }}
            >
              {t("issueToken", pref).toUpperCase()}
            </span>
          </Link>
          <Link
            href="/dashboard/schedules"
            className="card glass-panel"
            style={{
              flex: "1 1 250px",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                padding: "1rem",
                borderRadius: "1rem",
              }}
            >
              <Calendar size={32} color="var(--secondary)" />
            </div>
            <span
              style={{
                fontWeight: 800,
                color: "var(--text-main)",
                fontSize: "1.1rem",
              }}
            >
              {t("planSessions", pref).toUpperCase()}
            </span>
          </Link>
        </div>
      </div>

      {/* DELAY MODAL */}
      {showDelayModal && selectedSession && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
          onClick={() => setShowDelayModal(false)}
        >
          <div
            className="card glass-panel"
            style={{
              maxWidth: "450px",
              width: "100%",
              padding: "2.5rem",
              borderRadius: "2rem",
              animation: "fadeIn 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 900,
                  color: "var(--warning)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <AlertCircle size={28} /> {t("doctorDelayed", pref)}
              </h2>
              <button
                onClick={() => setShowDelayModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "0.5rem",
                }}
              >
                <Clock size={24} />
              </button>
            </div>

            <div
              style={{
                marginBottom: "2rem",
              }}
            >
              <label
                className="form-label"
                style={{
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                  marginBottom: "0.75rem",
                  display: "block",
                }}
              >
                {t("delayMinutes", pref).toUpperCase()}
              </label>
              <input
                type="number"
                className="form-input"
                style={{
                  height: "4rem",
                  fontSize: "2rem",
                  fontWeight: 900,
                  textAlign: "center",
                  borderRadius: "1.5rem",
                  border: "2px solid var(--warning)",
                }}
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(e.target.value)}
                min="0"
                step="5"
                autoFocus
              />
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-muted)",
                  marginTop: "1rem",
                  textAlign: "center",
                }}
              >
                This will recalculate waiting times for all patients
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "1rem",
              }}
            >
              <button
                onClick={() => setShowDelayModal(false)}
                className="btn btn-outline"
                style={{
                  flex: 1,
                  padding: "1.25rem",
                  fontWeight: 700,
                }}
              >
                {t("cancel", pref)}
              </button>
              <button
                onClick={submitDelay}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: "1.25rem",
                  fontWeight: 800,
                  backgroundColor: "var(--warning)",
                }}
              >
                {t("save", pref)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
