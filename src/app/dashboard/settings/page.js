"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Settings,
  QrCode,
  Globe,
  Check,
  User,
  MapPin,
  Send,
  CreditCard,
  Calendar,
  TrendingUp,
  Users,
} from "lucide-react";
import { t } from "@/lib/i18n/translations";
import { getAuthUser } from "@/app/actions/auth";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [pharmacy, setPharmacy] = useState(null);
  const [towns, setTowns] = useState([]);
  const [subscription, setSubscription] = useState(null);

  // Profile Request state
  const [profileData, setProfileData] = useState({
    name: "",
    phone: "",
    town_id: "",
  });
  const [pendingRequest, setPendingRequest] = useState(null);

  // Settings state
  const [language, setLanguage] = useState("en");
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [tokenFee, setTokenFee] = useState("");

  // QR state
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [qrUploading, setQrUploading] = useState(false);

  const [message, setMessage] = useState(null);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const user = await getAuthUser();
    if (!user) return;

    // Fetch Towns
    const { data: tData } = await supabase
      .from("towns")
      .select("*")
      .eq("is_active", true)
      .order("name");
    setTowns(tData || []);

    const { data: pData } = await supabase
      .from("pharmacies")
      .select(
        `
        *,
        pharmacy_subscriptions (
          *,
          subscription_plans (*)
        )
      `,
      )
      .eq("user_id", user.id)
      .single();
    if (pData) {
      setPharmacy(pData);
      setProfileData({
        name: pData.name || "",
        phone: pData.phone || "",
        town_id: pData.town_id || "",
      });
      setLanguage(pData.language || "en");
      setPaymentRequired(pData.payment_required || false);
      setTokenFee(pData.token_fee || "");
      setQrPreview(pData.upi_qr_url || null);

      // Get subscription
      const sub = pData.pharmacy_subscriptions?.[0];
      setSubscription(sub || null);

      // Check for pending requests
      const { data: reqData } = await supabase
        .from("pharmacy_edit_requests")
        .select("*")
        .eq("pharmacy_id", pData.id)
        .eq("status", "pending")
        .maybeSingle();
      setPendingRequest(reqData);
    }
    setLoading(false);
  };

  const handleRequestProfileUpdate = async (e) => {
    e.preventDefault();
    setRequesting(true);

    // Create Request
    const { error } = await supabase.from("pharmacy_edit_requests").insert([
      {
        pharmacy_id: pharmacy.id,
        suggested_name: profileData.name,
        suggested_phone: profileData.phone,
        suggested_town_id: profileData.town_id,
        suggested_town_name:
          towns.find((t) => t.id === profileData.town_id)?.name || "",
      },
    ]);

    if (error) setMessage({ type: "error", text: error.message });
    else {
      setMessage({
        type: "success",
        text: "Profile update request sent to platform admin.",
      });
      fetchData();
    }
    setRequesting(false);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    let qrUrl = pharmacy.upi_qr_url;

    if (qrFile) {
      setQrUploading(true);
      const fileExt = qrFile.name.split(".").pop();
      const filePath = `qr/${pharmacy.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("upi-qr")
        .upload(filePath, qrFile, { upsert: true });
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("upi-qr")
          .getPublicUrl(filePath);
        qrUrl = publicUrlData.publicUrl;
      }
      setQrUploading(false);
    }

    const { error: updateError } = await supabase
      .from("pharmacies")
      .update({
        language,
        payment_required: paymentRequired,
        token_fee: tokenFee ? parseFloat(tokenFee) : 0,
        upi_qr_url: qrUrl,
      })
      .eq("id", pharmacy.id);

    if (updateError) setMessage({ type: "error", text: updateError.message });
    else {
      setMessage({ type: "success", text: t("settingsSaved", language) });
      fetchData();
    }
    setSaving(false);
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
    <div className="animate-fade-in settings-page">
      <h1 className="page-title">{t("settings", pref)}</h1>

      {message && (
        <div className={`alert alert-${message.type}`}>
          <Check size={20} /> {message.text}
        </div>
      )}

      <div className="settings-columns">
        {/* LEFT COLUMN: Profile Requests */}
        <div>
          {/* Subscription Status Card */}
          <div className="card glass-panel" style={{ marginBottom: "2rem" }}>
            <h2 className="card-title">
              <CreditCard size={20} color="var(--primary)" /> Subscription
              Status
            </h2>

            {subscription ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {/* Plan Badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem",
                    backgroundColor: subscription.subscription_plans?.is_default
                      ? "var(--primary)15"
                      : "var(--surface)",
                    borderRadius: "var(--radius-md)",
                    border: subscription.subscription_plans?.is_default
                      ? "1px solid var(--primary)"
                      : "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "1.125rem",
                        color: "var(--text-main)",
                      }}
                    >
                      {subscription.subscription_plans?.name || "N/A"}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {subscription.subscription_plans?.description ||
                        "No description"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: "1.25rem",
                        color: "var(--primary)",
                      }}
                    >
                      ₹{subscription.subscription_plans?.price_monthly || 0}
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--text-muted)",
                        }}
                      >
                        /month
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    backgroundColor:
                      subscription.status === "active"
                        ? "var(--secondary)15"
                        : "var(--surface-hover)",
                    borderRadius: "var(--radius-md)",
                    border:
                      subscription.status === "active"
                        ? "1px solid var(--secondary)"
                        : "1px solid var(--border)",
                  }}
                >
                  <Check
                    size={18}
                    color={
                      subscription.status === "active"
                        ? "var(--secondary)"
                        : "var(--text-muted)"
                    }
                  />
                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        subscription.status === "active"
                          ? "var(--secondary)"
                          : "var(--text-muted)",
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                    }}
                  >
                    {subscription.status || "Inactive"}
                  </span>
                </div>

                {/* Usage Progress */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    <span
                      style={{ color: "var(--text-muted)", fontWeight: 600 }}
                    >
                      Tokens Used
                    </span>
                    <span style={{ fontWeight: 700 }}>
                      {subscription.tokens_used_this_month || 0} /{" "}
                      {subscription.subscription_plans?.max_tokens_per_month ===
                      0
                        ? "∞"
                        : subscription.subscription_plans
                            ?.max_tokens_per_month || "N/A"}
                    </span>
                  </div>
                  {subscription.subscription_plans?.max_tokens_per_month >
                    0 && (
                    <>
                      <div
                        style={{
                          height: "8px",
                          backgroundColor: "var(--border)",
                          borderRadius: "var(--radius-sm)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min((subscription.tokens_used_this_month / subscription.subscription_plans.max_tokens_per_month) * 100, 100)}%`,
                            backgroundColor:
                              subscription.tokens_used_this_month /
                                subscription.subscription_plans
                                  .max_tokens_per_month >
                              0.8
                                ? "var(--warning)"
                                : "var(--primary)",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          marginTop: "0.25rem",
                          textAlign: "right",
                        }}
                      >
                        {Math.round(
                          (subscription.tokens_used_this_month /
                            subscription.subscription_plans
                              .max_tokens_per_month) *
                            100,
                        )}
                        % used
                      </div>
                    </>
                  )}
                </div>

                {/* Plan Features */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "0.75rem",
                    padding: "1rem",
                    backgroundColor: "var(--surface)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <TrendingUp size={16} color="var(--text-muted)" />
                    <div>
                      <div
                        style={{
                          fontSize: "0.65rem",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                        }}
                      >
                        Schedules
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                        {subscription.subscription_plans?.max_schedules === 0
                          ? "∞"
                          : subscription.subscription_plans?.max_schedules ||
                            "N/A"}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Users size={16} color="var(--text-muted)" />
                    <div>
                      <div
                        style={{
                          fontSize: "0.65rem",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                        }}
                      >
                        Doctors
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                        {subscription.subscription_plans?.max_doctors === 0
                          ? "∞"
                          : subscription.subscription_plans?.max_doctors ||
                            "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Period Info */}
                {subscription.current_period_end && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.75rem",
                      backgroundColor: "var(--surface-hover)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.75rem",
                    }}
                  >
                    <Calendar size={14} color="var(--text-muted)" />
                    <span style={{ color: "var(--text-muted)" }}>
                      Renews on:
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {new Date(
                        subscription.current_period_end,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    textAlign: "center",
                    fontStyle: "italic",
                  }}
                >
                  Contact platform admin for subscription changes
                </p>
              </div>
            ) : (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                <CreditCard
                  size={48}
                  style={{ marginBottom: "1rem", opacity: 0.3 }}
                />
                <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                  No Subscription
                </p>
                <p style={{ fontSize: "0.75rem" }}>
                  Your pharmacy is on the free plan. Contact admin to upgrade.
                </p>
              </div>
            )}
          </div>

          <div className="card glass-panel">
            <h2 className="card-title">
              <User size={20} color="var(--primary)" /> Pharmacy Profile Details
            </h2>

            {pendingRequest && (
              <div className="profile-request-notice">
                <strong style={{ color: "var(--warning)" }}>
                  Pending Approval:
                </strong>{" "}
                Admin is reviewing your change request for:
                <div className="profile-request-details">
                  {pendingRequest.suggested_name && (
                    <div>• Name: {pendingRequest.suggested_name}</div>
                  )}
                  {pendingRequest.suggested_town_name && (
                    <div>• Town: {pendingRequest.suggested_town_name}</div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleRequestProfileUpdate}>
              <div className="form-group">
                <label className="form-label">Pharmacy Legal Name</label>
                <input
                  type="text"
                  className="form-input"
                  disabled={!!pendingRequest}
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  disabled={!!pendingRequest}
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData({ ...profileData, phone: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Operating Town</label>
                <select
                  className="form-select"
                  disabled={!!pendingRequest}
                  value={profileData.town_id}
                  onChange={(e) =>
                    setProfileData({ ...profileData, town_id: e.target.value })
                  }
                >
                  {towns.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-outline btn-sm"
                disabled={requesting || !!pendingRequest}
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  width: "100%",
                  marginTop: "1rem",
                }}
              >
                {requesting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Send size={16} /> Request Profile Update
                  </>
                )}
              </button>
              <p className="form-hint">
                Name and Town changes require admin verification.
              </p>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Functional Settings */}
        <div>
          <form
            onSubmit={handleSaveSettings}
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            <div className="card glass-panel">
              <h2 className="card-title">
                <Globe size={20} color="var(--primary)" />{" "}
                {t("languageSettings", pref)}
              </h2>
              <div>
                {["en", "ta", "both"].map((l) => (
                  <label key={l} className="language-option">
                    <input
                      type="radio"
                      name="lang"
                      value={l}
                      checked={language === l}
                      onChange={() => setLanguage(l)}
                    />
                    {l === "en"
                      ? t("englishOnly", pref)
                      : l === "ta"
                        ? t("tamilOnly", pref)
                        : t("bilingual", pref)}
                  </label>
                ))}
              </div>
            </div>

            <div className="card glass-panel">
              <h2 className="card-title">
                <QrCode size={20} color="var(--secondary)" />{" "}
                {t("paymentSettings", pref)}
              </h2>
              <label className="payment-toggle">
                <input
                  type="checkbox"
                  checked={paymentRequired}
                  onChange={(e) => setPaymentRequired(e.target.checked)}
                />
                {t("paymentRequired", pref)}
              </label>

              {paymentRequired && (
                <div className="form-group">
                  <label className="form-label">
                    {t("tokenFee", pref)} (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={tokenFee}
                    onChange={(e) => setTokenFee(e.target.value)}
                  />
                </div>
              )}

              <div className="qr-upload-container">
                {qrPreview && (
                  <img src={qrPreview} alt="QR" className="qr-preview" />
                )}
                <div className="qr-upload-btn-wrapper">
                  <button type="button" className="btn btn-outline btn-sm">
                    Upload UPI QR
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setQrFile(file);
                      setQrPreview(URL.createObjectURL(file));
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={saving || qrUploading}
            >
              {saving ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>Save Configuration</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
