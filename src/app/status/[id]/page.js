"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import {
  Loader2,
  User,
  Activity,
  Clock,
  HeartPulse,
  QrCode,
} from "lucide-react";
import { t, getStatusLabel } from "@/lib/i18n/translations";
import { calculateEstimatedWait, getCurrentToken } from "@/lib/utils";
import "../../globals.css";

export default function TokenStatusPage() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [pharmacy, setPharmacy] = useState(null);
  const [allTokens, setAllTokens] = useState([]);

  const params = useParams();
  const id = params.id;
  const supabase = createClient();

  useEffect(() => {
    if (id) {
      fetchData();

      // Fallback polling since Realtime publications are disabled in our custom MVP schema
      const interval = setInterval(() => {
        fetchData();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [id]);

  const fetchData = async () => {
    // Only set standard thick loading screen on the very first mount
    setLoading((prev) => (token ? false : true));

    // Fetch this token
    const { data: tData } = await supabase
      .from("tokens")
      .select("*, patients(name)")
      .eq("id", id)
      .single();
    if (tData) {
      setToken(tData);

      // Fetch Schedule & Doctor only if missing
      if (!schedule) {
        const { data: sData } = await supabase
          .from("schedules")
          .select("*, doctors(name, specialty)")
          .eq("id", tData.schedule_id)
          .single();
        if (sData) {
          setSchedule(sData);
          const { data: pData } = await supabase
            .from("pharmacies")
            .select("*")
            .eq("id", sData.pharmacy_id)
            .single();
          if (pData) setPharmacy(pData);
        }
      }

      await fetchTokens(tData.schedule_id);
    }
    setLoading(false);
  };

  const fetchTokens = async (schedId) => {
    if (!schedId) return;
    const { data } = await supabase
      .from("tokens")
      .select("id, token_number, status")
      .eq("schedule_id", schedId);
    setAllTokens(data || []);
  };

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2 className="animate-spin" color="var(--primary)" size={48} />
      </div>
    );

  if (!token || !schedule || !pharmacy) {
    return (
      <div className="status-page">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            textAlign: "center",
          }}
        >
          <Activity
            size={64}
            color="var(--text-muted)"
            style={{ opacity: 0.5, marginBottom: "1rem" }}
          />
          <h1>Token Not Found</h1>
          <p style={{ color: "var(--text-muted)" }}>
            This token link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  const pref = pharmacy?.language || "en";
  const currentTokenNum = getCurrentToken(allTokens);
  const estimatedWait = calculateEstimatedWait(
    token.token_number,
    currentTokenNum,
    schedule.avg_consultation_minutes,
    schedule.delay_minutes,
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "in_consultation":
        return "var(--secondary)";
      case "completed":
        return "var(--primary)";
      case "skipped":
        return "var(--text-muted)";
      case "cancelled":
        return "var(--danger)";
      default:
        return "var(--warning)";
    }
  };

  const statusColor = getStatusColor(token.status);

  return (
    <div className="status-page">
      {/* Header */}
      <header className="status-header glass-panel">
        <h1 className="status-pharmacy-name">{pharmacy.name}</h1>
        <p className="status-pharmacy-town">{pharmacy.town}</p>
      </header>

      {/* Main Status Board */}
      <main className="status-main animate-fade-in">
        {/* Your Token Big Box */}
        <div
          className="status-token-card card"
          style={{ borderTopColor: statusColor }}
        >
          <p className="status-token-label">{t("yourToken", pref)}</p>
          <div className="status-token-number" style={{ color: statusColor }}>
            #{token.token_number}
          </div>

          <div className="status-badge-container">
            <span
              className={`badge badge-${token.status === "in_consultation" ? "active" : token.status.replace("_", "-")}`}
              style={{ fontSize: "1rem", padding: "0.5rem 1rem" }}
            >
              {getStatusLabel(token.status, pref)}
            </span>
          </div>

          <h2 className="status-patient-name">{token.patients?.name}</h2>
        </div>

        {/* Live Queue Info */}
        {token.status === "waiting" && (
          <div className="status-queue-info glass-panel">
            <div className="status-queue-info-cell">
              <p className="status-queue-info-label">
                {t("currentlyServing", pref)}
              </p>
              <div
                className="status-queue-info-value"
                style={{ color: "var(--primary)" }}
              >
                <Activity size={24} className="pulse-indicator" /> #
                {currentTokenNum || "--"}
              </div>
            </div>

            <div className="status-queue-info-cell">
              <p className="status-queue-info-label">
                {t("estimatedWaitTime", pref)}
              </p>
              <div
                className="status-queue-info-value"
                style={{ color: "var(--warning)" }}
              >
                <Clock size={24} />{" "}
                {estimatedWait > 0
                  ? `${estimatedWait} ${t("minutes", pref)}`
                  : "--"}
              </div>
            </div>
          </div>
        )}

        {/* Doctor Info */}
        <div className="status-doctor-card card">
          <h3 className="status-doctor-title">
            <HeartPulse size={18} /> {t("doctorInfo", pref)}
          </h3>
          <div className="status-doctor-info">
            <div className="status-doctor-avatar">
              {schedule.doctors?.name?.charAt(0)}
            </div>
            <div className="status-doctor-details">
              <p className="status-doctor-name">Dr. {schedule.doctors?.name}</p>
              <p className="status-doctor-specialty">
                {schedule.doctors?.specialty}
              </p>
            </div>
          </div>
        </div>

        {/* Payment / QR Section (if enabled and applicable) */}
        {pharmacy.payment_required &&
          token.payment_status !== "paid" &&
          pharmacy.upi_qr_url && (
            <div className="status-payment-card card">
              <h3 className="status-payment-title">
                <QrCode size={20} color="var(--secondary)" />{" "}
                {t("payNow", pref)} (₹{pharmacy.token_fee})
              </h3>
              <p className="status-payment-desc">{t("scanQr", pref)}</p>
              <div className="status-qr-container">
                <img
                  src={pharmacy.upi_qr_url}
                  alt="UPI QR Code"
                  className="status-qr-image"
                />
              </div>
              <p className="status-disclaimer">
                {t("paymentDisclaimer", pref)}
              </p>
            </div>
          )}
      </main>

      <footer className="status-footer">
        <p className="status-footer-text">
          Powered by <strong>Town Care</strong>
        </p>
      </footer>
    </div>
  );
}
