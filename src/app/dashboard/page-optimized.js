"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import useSWR from 'swr';
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
  const [pharmacy, setPharmacy] = useState(null);
  const supabase = createClient();
  const today = getTodayDate();

  // Fetch pharmacy data with SWR caching
  const { data: pharmacyData, isLoading: pharmacyLoading } = useSWR(
    'dashboard-pharmacy',
    async () => {
      const user = await getAuthUser();
      if (!user) return null;

      const { data } = await supabase
        .from("pharmacies")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) setPharmacy(data);
      return data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute cache
    }
  );

  // Fetch today's schedules with tokens - auto refresh
  const { data: activeSessions, isLoading: sessionsLoading } = useSWR(
    pharmacyData ? `dashboard-sessions-${pharmacyData.id}-${today}` : null,
    async () => {
      if (!pharmacyData) return [];

      const { data: scheds } = await supabase
        .from("schedules")
        .select(
          `*, doctors(name, specialty), tokens(id, token_number, status, patients(name))`,
        )
        .eq("pharmacy_id", pharmacyData.id)
        .eq("schedule_date", today)
        .eq("is_active", true);

      return scheds || [];
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Auto-refresh every 30 seconds
      dedupingInterval: 10000,
    }
  );

  const updateStatus = async (tokenId, newStatus) => {
    await supabase
      .from("tokens")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", tokenId);

    // Optimistic update - mutate cache immediately
    const cacheKey = `dashboard-sessions-${pharmacyData.id}-${today}`;
    const currentData = activeSessions || [];
    const updatedData = currentData.map(session => ({
      ...session,
      tokens: session.tokens?.map(token =>
        token.id === tokenId
          ? { ...token, status: newStatus }
          : token
      )
    }));

    // Mutate SWR cache
    import('swr').then(({ mutate }) => mutate(cacheKey, updatedData, false));
  };

  const pref = pharmacyData?.language || "en";
  const loading = pharmacyLoading || sessionsLoading;

  if (loading || !pharmacyData)
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
          {pharmacyData?.name}
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

      <div>
        {(!activeSessions || activeSessions.length === 0) ? (
          <div
            className="card glass-panel"
            style={{
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
          <div className="card glass-panel" style={{ overflow: "hidden" }}>
            {/* Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr 1fr 1.5fr",
                padding: "1.25rem 1.5rem",
                backgroundColor: "var(--background)",
                borderBottom: "1px solid var(--border)",
                fontWeight: 800,
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <div>Doctor</div>
              <div>Status</div>
              <div>Current Token</div>
              <div>Next Token</div>
              <div>Waiting</div>
              <div>Actions</div>
            </div>

            {/* Table Body */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {activeSessions.map((session, index) => {
                const waiting =
                  session.tokens?.filter((t) => t.status === "waiting") || [];
                const active = session.tokens?.find(
                  (t) => t.status === "in_consultation",
                );

                return (
                  <div
                    key={session.id}
                    className="animate-fade-in"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr 1fr 1.5fr",
                      padding: "1.25rem 1.5rem",
                      alignItems: "center",
                      borderBottom:
                        index < activeSessions.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                      backgroundColor:
                        index % 2 === 0 ? "var(--surface)" : "var(--background)",
                    }}
                  >
                    {/* Doctor */}
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "1.1rem",
                          color: "var(--text-main)",
                        }}
                      >
                        Dr. {session.doctors?.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {session.doctors?.specialty || t("none", pref)}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <div
                        className={`badge badge-${
                          active ? "active" : "waiting"
                        }`}
                        style={{
                          fontSize: "0.7rem",
                          padding: "0.5rem 0.75rem",
                          fontWeight: 800,
                        }}
                      >
                        {active ? t("liveSession", pref) : t("offline", pref)}
                      </div>
                    </div>

                    {/* Current Token */}
                    <div>
                      {active ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              backgroundColor: "var(--secondary)",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "0.9rem",
                            }}
                          >
                            {active.token_number}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "0.7rem",
                                color: "var(--text-muted)",
                                fontWeight: 700,
                              }}
                            >
                              {t("insideWithDoctor", pref)}
                            </div>
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--text-main)",
                                fontWeight: 600,
                              }}
                            >
                              {active.patients?.name}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          {t("waiting", pref)}...
                        </div>
                      )}
                    </div>

                    {/* Next Token */}
                    <div>
                      {waiting.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              backgroundColor: "var(--primary)",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "0.8rem",
                            }}
                          >
                            {waiting[0].token_number}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-main)",
                              fontWeight: 600,
                            }}
                          >
                            {waiting[0].patients?.name}
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          --
                        </div>
                      )}
                    </div>

                    {/* Waiting Count */}
                    <div>
                      <div
                        style={{
                          fontSize: "1.25rem",
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
                        {t("waitingPatients", pref)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {!active && waiting.length > 0 && (
                        <button
                          onClick={() =>
                            updateStatus(waiting[0].id, "in_consultation")
                          }
                          className="btn btn-primary btn-sm"
                          style={{
                            padding: "0.5rem 0.75rem",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                          }}
                          title={t("startConsultation", pref)}
                        >
                          <Play size={16} />
                        </button>
                      )}
                      {active && (
                        <button
                          onClick={() => updateStatus(active.id, "completed")}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: "0.5rem 0.75rem",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                          }}
                          title={t("completeToken", pref)}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <Link
                        href={`/dashboard/queue?schedule=${session.id}`}
                        className="btn btn-outline btn-sm"
                        style={{
                          padding: "0.5rem 0.75rem",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                        }}
                      >
                        {t("manageQueue", pref)}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
    </div>
  );
}
