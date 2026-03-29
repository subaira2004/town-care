"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import useSWR from "swr";
import {
  Loader2,
  Search,
  Building2,
  Check,
  X,
  Calendar,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Edit2,
} from "lucide-react";

export default function AdminSubscriptionsPharmaciesPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [message, setMessage] = useState(null);
  const [tab, setTab] = useState("active");
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const {
    data: pharmacies,
    isLoading: pharmaciesLoading,
    mutate,
  } = useSWR(`admin-pharmacies-subscriptions-${tab}`, async () => {
    let query = supabase.from("pharmacies").select(`
          *,
          pharmacy_subscriptions (
            *,
            subscription_plans (name, price_monthly, max_tokens_per_month)
          ),
          towns (name)
        `);

    if (searchQuery) {
      query = query.ilike("name", `%${searchQuery}%`);
    }

    const { data } = await query.order("created_at", { ascending: false });
    return data || [];
  });

  const { data: plans } = useSWR("admin-subscription-plans-list", async () => {
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("price_monthly");
    return data || [];
  });

  const handleAssign = (pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setSelectedPlanId(pharmacy.pharmacy_subscriptions?.[0]?.plan_id || "");
    setShowAssignModal(true);
  };

  const handleAssignSubscription = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.target);
    const planId = formData.get("plan_id");
    const periodMonths = parseInt(formData.get("period_months")) || 1;
    const startDate = formData.get("start_date");

    // Calculate end date
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + periodMonths);

    const subscriptionData = {
      pharmacy_id: selectedPharmacy.id,
      plan_id: planId,
      status: "active",
      current_period_start: startDate,
      current_period_end: end.toISOString().split("T")[0],
      tokens_used_this_month: 0,
    };

    try {
      // Check if subscription exists
      const { data: existing } = await supabase
        .from("pharmacy_subscriptions")
        .select("id")
        .eq("pharmacy_id", selectedPharmacy.id)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("pharmacy_subscriptions")
          .update(subscriptionData)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("pharmacy_subscriptions")
          .insert([subscriptionData]);
        if (error) throw error;
      }

      // Create invoice
      const plan = plans.find((p) => p.id === planId);
      const amount = plan.price_monthly * periodMonths;
      const invoiceNumber = `INV-${new Date().toISOString().slice(0, 7)}-${selectedPharmacy.id.slice(0, 8).toUpperCase()}`;

      await supabase.from("invoices").insert([
        {
          pharmacy_id: selectedPharmacy.id,
          amount,
          period_start: startDate,
          period_end: end.toISOString().split("T")[0],
          invoice_number: invoiceNumber,
          status: "pending",
          due_date: end.toISOString().split("T")[0],
          notes: `Subscription: ${plan.name} x ${periodMonths} month(s)`,
        },
      ]);

      setMessage({
        type: "success",
        text: "Subscription assigned successfully!",
      });

      // Force close modal and reset state
      setShowAssignModal(false);
      setSelectedPharmacy(null);
      setSelectedPlanId("");

      // Force reload to ensure fresh data
      setTimeout(() => {
        mutate();
      }, 100);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
    setLoading(false);
  };

  const handleMarkPayment = async (pharmacyId, amount) => {
    if (
      !confirm(
        `Mark ₹${amount} as received for this pharmacy's current invoice?`,
      )
    )
      return;

    setLoading(true);
    try {
      // Get current invoice
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id")
        .eq("pharmacy_id", pharmacyId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (invoice) {
        const { error } = await supabase
          .from("invoices")
          .update({
            status: "paid",
            payment_date: new Date().toISOString().split("T")[0],
            paid_at: new Date().toISOString(),
          })
          .eq("id", invoice.id);
        if (error) throw error;
      }

      // Update subscription last payment date
      await supabase
        .from("pharmacy_subscriptions")
        .update({ last_payment_date: new Date().toISOString().split("T")[0] })
        .eq("pharmacy_id", pharmacyId);

      setMessage({ type: "success", text: "Payment marked as received!" });
      mutate();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
    setLoading(false);
  };

  const filteredPharmacies =
    pharmacies?.filter((pharm) => {
      const sub = pharm.pharmacy_subscriptions?.[0];
      if (tab === "active") return sub?.status === "active";
      if (tab === "trial") return sub?.status === "trial";
      if (tab === "cancelled")
        return !sub || sub.status === "cancelled" || sub.status === "expired";
      return true;
    }) || [];

  return (
    <div className="animate-fade-in">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: "var(--primary)",
              marginBottom: "0.5rem",
            }}
          >
            Pharmacy Subscriptions
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Assign and manage pharmacy subscriptions
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`alert alert-${message.type}`}
          style={{ marginBottom: "1.5rem" }}
        >
          {message.type === "success" ? (
            <Check size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          backgroundColor: "var(--surface-hover)",
          padding: "0.25rem",
          borderRadius: "var(--radius-md)",
          width: "fit-content",
        }}
      >
        {["active", "trial", "cancelled"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`btn btn-sm ${tab === t ? "btn-primary" : ""}`}
            style={{ border: "none" }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div
        className="card glass-panel"
        style={{ padding: "1.5rem", marginBottom: "1.5rem" }}
      >
        <div style={{ position: "relative" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: "3rem" }}
            placeholder="Search pharmacies by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Pharmacy List */}
      {pharmaciesLoading ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
        >
          <Loader2 className="animate-spin" color="var(--primary)" size={32} />
        </div>
      ) : filteredPharmacies.length === 0 ? (
        <div
          className="card glass-panel"
          style={{ padding: "3rem", textAlign: "center" }}
        >
          <p style={{ color: "var(--text-muted)" }}>No pharmacies found</p>
        </div>
      ) : (
        <div
          className="card glass-panel"
          style={{ padding: "0", overflow: "hidden" }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead
              style={{
                backgroundColor: "var(--surface-hover)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <tr>
                <th style={{ padding: "1rem" }}>Pharmacy</th>
                <th style={{ padding: "1rem" }}>Town</th>
                <th style={{ padding: "1rem" }}>Subscription</th>
                <th style={{ padding: "1rem" }}>Period</th>
                <th style={{ padding: "1rem" }}>Usage</th>
                <th style={{ padding: "1rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPharmacies.map((pharm) => {
                const sub = pharm.pharmacy_subscriptions?.[0];
                const plan = sub?.subscription_plans;
                const usagePercent =
                  plan?.max_tokens_per_month > 0
                    ? Math.round(
                        (sub?.tokens_used_this_month /
                          plan.max_tokens_per_month) *
                          100,
                      )
                    : 0;

                return (
                  <tr
                    key={pharm.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: "600" }}>{pharm.name}</div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {pharm.phone}
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {pharm.towns?.name || pharm.town_name || "-"}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {plan ? (
                        <div>
                          <div style={{ fontWeight: "600" }}>{plan.name}</div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--secondary)",
                            }}
                          >
                            ₹{plan.price_monthly}/mo
                          </div>
                        </div>
                      ) : (
                        <span
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.875rem",
                          }}
                        >
                          No subscription
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {sub?.current_period_start && sub?.current_period_end ? (
                        <div style={{ fontSize: "0.875rem" }}>
                          {new Date(
                            sub.current_period_start,
                          ).toLocaleDateString()}{" "}
                          -{" "}
                          {new Date(
                            sub.current_period_end,
                          ).toLocaleDateString()}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {plan?.max_tokens_per_month > 0 ? (
                        <div>
                          <div
                            style={{
                              fontSize: "0.875rem",
                              marginBottom: "0.25rem",
                            }}
                          >
                            {sub?.tokens_used_this_month || 0} /{" "}
                            {plan.max_tokens_per_month}
                          </div>
                          <div
                            style={{
                              height: "6px",
                              backgroundColor: "var(--border)",
                              borderRadius: "3px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${usagePercent}%`,
                                backgroundColor:
                                  usagePercent > 80
                                    ? "var(--danger)"
                                    : usagePercent > 50
                                      ? "var(--warning)"
                                      : "var(--secondary)",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.75rem",
                          }}
                        >
                          Unlimited
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          onClick={() => handleAssign(pharm)}
                          className="btn btn-primary btn-sm"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          {sub ? <Edit2 size={14} /> : <Check size={14} />}
                          {sub ? "Edit" : "Assign"}
                        </button>
                        {sub && (
                          <button
                            onClick={() =>
                              handleMarkPayment(
                                pharm.id,
                                plan?.price_monthly || 0,
                              )
                            }
                            className="btn btn-secondary btn-sm"
                            disabled={loading}
                            title="Mark payment received"
                          >
                            <DollarSign size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedPharmacy && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "2rem",
              position: "relative",
            }}
          >
            <button
              onClick={() => {
                setShowAssignModal(false);
                setSelectedPharmacy(null);
              }}
              style={{
                position: "absolute",
                right: "1rem",
                top: "1rem",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <X size={24} />
            </button>

            <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>
              {selectedPharmacy.pharmacy_subscriptions?.[0]
                ? "Manage Subscription"
                : "Assign Subscription"}
            </h2>
            <p style={{ marginBottom: "1.5rem", color: "var(--text-muted)" }}>
              {selectedPharmacy.name}
            </p>

            <form onSubmit={handleAssignSubscription}>
              <div className="form-group">
                <label className="form-label">Subscription Plan *</label>
                <select
                  name="plan_id"
                  className="form-select"
                  required
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                >
                  <option value="">Select a plan...</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price_monthly}/month (
                      {plan.max_tokens_per_month || "∞"} tokens)
                    </option>
                  ))}
                </select>
              </div>

              {selectedPharmacy.pharmacy_subscriptions?.[0] && (
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "var(--surface)",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "1rem",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Current Subscription
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.75rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Plan:</span>{" "}
                      <strong>
                        {
                          selectedPharmacy.pharmacy_subscriptions[0]
                            .subscription_plans?.name
                        }
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>
                        Status:
                      </span>{" "}
                      <span
                        className="badge"
                        style={{
                          backgroundColor:
                            selectedPharmacy.pharmacy_subscriptions[0]
                              .status === "active"
                              ? "var(--secondary)"
                              : "var(--warning)",
                          color: "white",
                          fontSize: "0.65rem",
                          padding: "0.2rem 0.4rem",
                          marginLeft: "0.25rem",
                        }}
                      >
                        {selectedPharmacy.pharmacy_subscriptions[0].status}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Usage:</span>{" "}
                      <strong>
                        {selectedPharmacy.pharmacy_subscriptions[0]
                          .tokens_used_this_month || 0}
                      </strong>{" "}
                      tokens
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>
                        Renews:
                      </span>{" "}
                      <strong>
                        {selectedPharmacy.pharmacy_subscriptions[0]
                          .current_period_end
                          ? new Date(
                              selectedPharmacy.pharmacy_subscriptions[0]
                                .current_period_end,
                            ).toLocaleDateString()
                          : "N/A"}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  name="start_date"
                  type="date"
                  className="form-input"
                  defaultValue={
                    selectedPharmacy.pharmacy_subscriptions?.[0]
                      ?.current_period_start ||
                    new Date().toISOString().split("T")[0]
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Duration (months)</label>
                <select
                  name="period_months"
                  className="form-select"
                  defaultValue="1"
                >
                  <option value="1">1 Month</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: "100%", marginTop: "1rem" }}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  "Save Subscription"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
