"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import useSWR from "swr";
import {
  Loader2,
  Calendar,
  Download,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  DollarSign,
  Activity,
  AlertCircle,
} from "lucide-react";
import { getAuthUser } from "@/app/actions/auth";

export default function PharmacyReportsPage() {
  const supabase = createClient();
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // Last 30 days
    end: new Date().toISOString().split("T")[0],
  });
  const [reportType, setReportType] = useState("daily");
  const [recordLimit] = useState(10000);
  const maxDateRangeDays = 90; // Maximum 3 months

  // Validate date range doesn't exceed 3 months
  const validateDateRange = (range) => {
    const start = new Date(range.start);
    const end = new Date(range.end);
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);

    if (diffDays > maxDateRangeDays) {
      alert(
        `Maximum date range is ${maxDateRangeDays} days (3 months). Please select a shorter range.`,
      );
      return false;
    }
    return true;
  };

  const handleDateRangeChange = (newRange) => {
    if (validateDateRange(newRange)) {
      setDateRange(newRange);
    }
  };

  return (
    <div
      className="animate-fade-in"
      style={{ paddingBottom: "var(--spacing-xl)" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "var(--spacing-xl)" }}>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 900,
            color: "var(--text-main)",
            marginBottom: "var(--spacing-sm)",
          }}
        >
          Reports & Analytics
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
          Generate and export business reports
        </p>
      </div>

      {/* Report Type Tabs */}
      <div
        style={{
          display: "flex",
          gap: "var(--spacing-sm)",
          marginBottom: "var(--spacing-lg)",
          overflowX: "auto",
          paddingBottom: "var(--spacing-sm)",
        }}
      >
        {[
          { id: "daily", label: "Daily Token", icon: <Calendar size={16} /> },
          {
            id: "doctor",
            label: "Doctor Performance",
            icon: <Users size={16} />,
          },
          {
            id: "monthly",
            label: "Monthly Summary",
            icon: <TrendingUp size={16} />,
          },
          {
            id: "patient",
            label: "Patient Retention",
            icon: <Activity size={16} />,
          },
          {
            id: "payment",
            label: "Payment Collection",
            icon: <DollarSign size={16} />,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`btn ${reportType === tab.id ? "btn-primary" : "btn-outline"}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              whiteSpace: "nowrap",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Range Selector */}
      <div
        className="card glass-panel"
        style={{
          padding: "var(--spacing-md)",
          marginBottom: "var(--spacing-lg)",
          display: "flex",
          gap: "var(--spacing-md)",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-sm)",
            fontWeight: 600,
          }}
        >
          <Calendar size={18} color="var(--primary)" />
          Date Range:
        </label>

        <input
          type="date"
          className="form-input"
          value={dateRange.start}
          onChange={(e) =>
            handleDateRangeChange({ ...dateRange, start: e.target.value })
          }
          style={{ maxWidth: "160px" }}
        />
        <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>to</span>
        <input
          type="date"
          className="form-input"
          value={dateRange.end}
          onChange={(e) =>
            handleDateRangeChange({ ...dateRange, end: e.target.value })
          }
          style={{ maxWidth: "160px" }}
        />
        <button
          onClick={() =>
            handleDateRangeChange({
              start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              end: new Date().toISOString().split("T")[0],
            })
          }
          className="btn btn-outline btn-sm"
        >
          7D
        </button>
        <button
          onClick={() =>
            handleDateRangeChange({
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              end: new Date().toISOString().split("T")[0],
            })
          }
          className="btn btn-outline btn-sm"
        >
          30D
        </button>
        <button
          onClick={() =>
            handleDateRangeChange({
              start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              end: new Date().toISOString().split("T")[0],
            })
          }
          className="btn btn-outline btn-sm"
        >
          90D
        </button>

        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            fontWeight: 600,
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <AlertCircle size={14} />
          Max {recordLimit.toLocaleString()} records • {maxDateRangeDays} days
          max
        </div>
      </div>

      {/* Report Content */}
      {reportType === "daily" && (
        <DailyTokenReport
          selectedDate={selectedDate}
          dateRange={dateRange}
          recordLimit={recordLimit}
        />
      )}
      {reportType === "doctor" && (
        <DoctorPerformanceReport
          dateRange={dateRange}
          recordLimit={recordLimit}
        />
      )}
      {reportType === "monthly" && (
        <MonthlySummaryReport dateRange={dateRange} recordLimit={recordLimit} />
      )}
      {reportType === "patient" && (
        <PatientRetentionReport
          dateRange={dateRange}
          recordLimit={recordLimit}
        />
      )}
      {reportType === "payment" && (
        <PaymentCollectionReport
          dateRange={dateRange}
          recordLimit={recordLimit}
        />
      )}
    </div>
  );
}

// ============================================
// DAILY TOKEN REPORT
// ============================================

function DailyTokenReport({ selectedDate, dateRange, recordLimit }) {
  const supabase = createClient();

  const { data: report, isLoading } = useSWR(
    `daily-token-report-${selectedDate}`,
    async () => {
      const user = await getAuthUser();
      if (!user) return null;

      const { data: pharmacy } = await supabase
        .from("pharmacies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!pharmacy) return null;

      // Get schedules for the selected date
      const { data: schedules } = await supabase
        .from("schedules")
        .select("id, doctor_id, delay_minutes")
        .eq("pharmacy_id", pharmacy.id)
        .eq("schedule_date", selectedDate);

      if (!schedules || schedules.length === 0) {
        return { tokens: [], summary: {}, schedules: [] };
      }

      const scheduleIds = schedules.map((s) => s.id);

      // Get tokens for these schedules
      const { data: tokens } = await supabase
        .from("tokens")
        .select(
          `
          *,
          patients (name, phone),
          schedules (
            doctor_id,
            doctors (name)
          )
        `,
        )
        .in("schedule_id", scheduleIds)
        .order("token_number");

      // Calculate summary
      const summary = {
        total: tokens?.length || 0,
        completed: tokens?.filter((t) => t.status === "completed").length || 0,
        waiting: tokens?.filter((t) => t.status === "waiting").length || 0,
        inConsultation:
          tokens?.filter((t) => t.status === "in_consultation").length || 0,
        skipped:
          tokens?.filter(
            (t) => t.status === "skipped" || t.status === "cancelled",
          ).length || 0,
        paid: tokens?.filter((t) => t.payment_status === "paid").length || 0,
        revenue:
          tokens?.filter((t) => t.payment_status === "paid").length * 50 || 0,
      };

      return { tokens: tokens || [], summary, schedules };
    },
  );

  const handleExportCSV = () => {
    if (!report?.tokens?.length) return;

    const headers = [
      "Token #",
      "Patient Name",
      "Phone",
      "Doctor",
      "Status",
      "Payment Status",
      "Booking Type",
      "Created At",
    ];
    const rows = report.tokens.map((t) => [
      t.token_number,
      t.patients?.name,
      t.patients?.phone,
      t.schedules?.doctors?.name || "-",
      t.status,
      t.payment_status,
      t.booking_type,
      new Date(t.created_at).toLocaleString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-token-report-${selectedDate}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
      >
        <Loader2 className="animate-spin" color="var(--primary)" size={32} />
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "var(--spacing-md)",
          marginBottom: "var(--spacing-xl)",
        }}
      >
        <SummaryCard
          icon={<Users size={20} />}
          label="Total Tokens"
          value={report?.summary?.total || 0}
          color="var(--primary)"
        />
        <SummaryCard
          icon={<CheckCircle2 size={20} />}
          label="Completed"
          value={report?.summary?.completed || 0}
          color="var(--secondary)"
        />
        <SummaryCard
          icon={<Clock size={20} />}
          label="Waiting"
          value={report?.summary?.waiting || 0}
          color="var(--warning)"
        />
        <SummaryCard
          icon={<XCircle size={20} />}
          label="Skipped"
          value={report?.summary?.skipped || 0}
          color="var(--danger)"
        />
        <SummaryCard
          icon={<DollarSign size={20} />}
          label="Revenue (₹)"
          value={report?.summary?.revenue || 0}
          color="var(--secondary)"
        />
      </div>

      {/* Token List */}
      <div
        className="card glass-panel"
        style={{ padding: "0", overflow: "hidden" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "var(--spacing-md)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 800 }}>
            Token Details for {new Date(selectedDate).toLocaleDateString()}
          </h3>
          <button
            onClick={handleExportCSV}
            disabled={!report?.tokens?.length}
            className="btn btn-outline btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {report?.tokens?.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <Calendar
              size={48}
              style={{ marginBottom: "var(--spacing-md)", opacity: 0.5 }}
            />
            <p>
              No tokens found for {new Date(selectedDate).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead style={{ backgroundColor: "var(--surface-hover)" }}>
                <tr>
                  <th style={{ padding: "var(--spacing-sm)" }}>Token #</th>
                  <th style={{ padding: "var(--spacing-sm)" }}>Patient</th>
                  <th style={{ padding: "var(--spacing-sm)" }}>Phone</th>
                  <th style={{ padding: "var(--spacing-sm)" }}>Doctor</th>
                  <th style={{ padding: "var(--spacing-sm)" }}>Status</th>
                  <th style={{ padding: "var(--spacing-sm)" }}>Payment</th>
                  <th style={{ padding: "var(--spacing-sm)" }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {report.tokens.map((token) => (
                  <tr
                    key={token.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td
                      style={{ padding: "var(--spacing-md)", fontWeight: 700 }}
                    >
                      #{token.token_number}
                    </td>
                    <td style={{ padding: "var(--spacing-md)" }}>
                      {token.patients?.name}
                    </td>
                    <td
                      style={{
                        padding: "var(--spacing-md)",
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      {token.patients?.phone}
                    </td>
                    <td
                      style={{
                        padding: "var(--spacing-md)",
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      {token.schedules?.doctors?.name}
                    </td>
                    <td style={{ padding: "var(--spacing-md)" }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor:
                            token.status === "completed"
                              ? "var(--secondary)"
                              : token.status === "waiting"
                                ? "var(--warning)"
                                : "var(--primary)",
                          color: "white",
                          fontSize: "var(--text-xs)",
                        }}
                      >
                        {token.status}
                      </span>
                    </td>
                    <td style={{ padding: "var(--spacing-md)" }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor:
                            token.payment_status === "paid"
                              ? "var(--secondary)"
                              : "var(--surface-hover)",
                          color:
                            token.payment_status === "paid"
                              ? "white"
                              : "var(--text-muted)",
                          fontSize: "var(--text-xs)",
                        }}
                      >
                        {token.payment_status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "var(--spacing-md)",
                        fontSize: "var(--text-sm)",
                        textTransform: "capitalize",
                      }}
                    >
                      {token.booking_type.replace("_", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// DOCTOR PERFORMANCE REPORT
// ============================================

function DoctorPerformanceReport() {
  const supabase = createClient();

  const { data: report, isLoading } = useSWR(
    "doctor-performance-report",
    async () => {
      const user = await getAuthUser();
      if (!user) return null;

      const { data: pharmacy } = await supabase
        .from("pharmacies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!pharmacy) return null;

      // Get all schedules with tokens
      const { data: schedules } = await supabase
        .from("schedules")
        .select(
          `
          *,
          doctors (name, specialty),
          tokens (status, created_at)
        `,
        )
        .eq("pharmacy_id", pharmacy.id)
        .order("schedule_date", { ascending: false })
        .limit(50);

      // Aggregate by doctor
      const doctorStats = {};
      schedules?.forEach((sched) => {
        const doctorName = sched.doctors?.name || "Unknown";
        if (!doctorStats[doctorName]) {
          doctorStats[doctorName] = {
            name: doctorName,
            specialty: sched.doctors?.specialty || "-",
            totalSchedules: 0,
            totalTokens: 0,
            completed: 0,
            totalDelay: 0,
          };
        }
        doctorStats[doctorName].totalSchedules++;
        doctorStats[doctorName].totalTokens += sched.tokens?.length || 0;
        doctorStats[doctorName].completed +=
          sched.tokens?.filter((t) => t.status === "completed").length || 0;
        doctorStats[doctorName].totalDelay += sched.delay_minutes || 0;
      });

      return Object.values(doctorStats).sort(
        (a, b) => b.totalTokens - a.totalTokens,
      );
    },
  );

  const handleExportCSV = () => {
    if (!report?.length) return;
    const headers = [
      "Doctor",
      "Specialty",
      "Schedules",
      "Total Tokens",
      "Completed",
      "Completion %",
      "Total Delay (min)",
    ];
    const rows = report.map((d) => [
      d.name,
      d.specialty,
      d.totalSchedules,
      d.totalTokens,
      d.completed,
      d.totalTokens > 0 ? Math.round((d.completed / d.totalTokens) * 100) : 0,
      d.totalDelay,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doctor-performance-report.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
      >
        <Loader2 className="animate-spin" color="var(--primary)" size={32} />
      </div>
    );
  }

  return (
    <div
      className="card glass-panel"
      style={{ padding: "0", overflow: "hidden" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "var(--spacing-md)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 800 }}>
          Doctor Performance Summary
        </h3>
        <button
          onClick={handleExportCSV}
          disabled={!report?.length}
          className="btn btn-outline btn-sm"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {report?.length === 0 ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <Users
            size={48}
            style={{ marginBottom: "var(--spacing-md)", opacity: 0.5 }}
          />
          <p>No doctor data available</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead style={{ backgroundColor: "var(--surface-hover)" }}>
              <tr>
                <th style={{ padding: "var(--spacing-sm)" }}>Doctor</th>
                <th style={{ padding: "var(--spacing-sm)" }}>Specialty</th>
                <th
                  style={{ padding: "var(--spacing-sm)", textAlign: "right" }}
                >
                  Schedules
                </th>
                <th
                  style={{ padding: "var(--spacing-sm)", textAlign: "right" }}
                >
                  Total Tokens
                </th>
                <th
                  style={{ padding: "var(--spacing-sm)", textAlign: "right" }}
                >
                  Completed
                </th>
                <th
                  style={{ padding: "var(--spacing-sm)", textAlign: "right" }}
                >
                  Completion %
                </th>
                <th
                  style={{ padding: "var(--spacing-sm)", textAlign: "right" }}
                >
                  Total Delay
                </th>
              </tr>
            </thead>
            <tbody>
              {report.map((doctor) => (
                <tr
                  key={doctor.name}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td style={{ padding: "var(--spacing-md)", fontWeight: 600 }}>
                    {doctor.name}
                  </td>
                  <td
                    style={{
                      padding: "var(--spacing-md)",
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    {doctor.specialty}
                  </td>
                  <td
                    style={{ padding: "var(--spacing-md)", textAlign: "right" }}
                  >
                    {doctor.totalSchedules}
                  </td>
                  <td
                    style={{
                      padding: "var(--spacing-md)",
                      textAlign: "right",
                      fontWeight: 600,
                    }}
                  >
                    {doctor.totalTokens}
                  </td>
                  <td
                    style={{ padding: "var(--spacing-md)", textAlign: "right" }}
                  >
                    {doctor.completed}
                  </td>
                  <td
                    style={{ padding: "var(--spacing-md)", textAlign: "right" }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          doctor.totalTokens > 0 &&
                          doctor.completed / doctor.totalTokens >= 0.8
                            ? "var(--secondary)"
                            : "var(--warning)",
                      }}
                    >
                      {doctor.totalTokens > 0
                        ? Math.round(
                            (doctor.completed / doctor.totalTokens) * 100,
                          )
                        : 0}
                      %
                    </span>
                  </td>
                  <td
                    style={{ padding: "var(--spacing-md)", textAlign: "right" }}
                  >
                    <span
                      style={{
                        color:
                          doctor.totalDelay > 30
                            ? "var(--danger)"
                            : "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {doctor.totalDelay} min
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================
// MONTHLY SUMMARY REPORT
// ============================================

function MonthlySummaryReport() {
  const supabase = createClient();

  const { data: report, isLoading } = useSWR(
    "monthly-summary-report",
    async () => {
      const user = await getAuthUser();
      if (!user) return null;

      const { data: pharmacy } = await supabase
        .from("pharmacies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!pharmacy) return null;

      // Get all schedules
      const { data: schedules } = await supabase
        .from("schedules")
        .select("id")
        .eq("pharmacy_id", pharmacy.id);

      if (!schedules) return null;

      const scheduleIds = schedules.map((s) => s.id);

      // Get all tokens
      const { data: tokens } = await supabase
        .from("tokens")
        .select("status, payment_status, created_at")
        .in("schedule_id", scheduleIds);

      // Group by month
      const monthlyData = {};
      tokens?.forEach((token) => {
        const month = new Date(token.created_at).toLocaleString("default", {
          month: "short",
          year: "2-digit",
        });
        if (!monthlyData[month]) {
          monthlyData[month] = { total: 0, completed: 0, revenue: 0 };
        }
        monthlyData[month].total++;
        if (token.status === "completed") monthlyData[month].completed++;
        if (token.payment_status === "paid") monthlyData[month].revenue += 50;
      });

      return Object.entries(monthlyData)
        .map(([month, data]) => ({ month, ...data }))
        .reverse();
    },
  );

  const handleExportCSV = () => {
    if (!report?.length) return;
    const headers = ["Month", "Total Tokens", "Completed", "Revenue (₹)"];
    const rows = report.map((m) => [m.month, m.total, m.completed, m.revenue]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monthly-summary-report.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
      >
        <Loader2 className="animate-spin" color="var(--primary)" size={32} />
      </div>
    );
  }

  return (
    <div
      className="card glass-panel"
      style={{ padding: "0", overflow: "hidden" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "var(--spacing-md)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 800 }}>
          Monthly Business Summary
        </h3>
        <button
          onClick={handleExportCSV}
          disabled={!report?.length}
          className="btn btn-outline btn-sm"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {report?.length === 0 ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <TrendingUp
            size={48}
            style={{ marginBottom: "var(--spacing-md)", opacity: 0.5 }}
          />
          <p>No data available</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead style={{ backgroundColor: "var(--surface-hover)" }}>
              <tr>
                <th style={{ padding: "var(--spacing-sm)" }}>Month</th>
                <th
                  style={{ padding: "var(--spacing-sm)", textAlign: "right" }}
                >
                  Total Tokens
                </th>
                <th
                  style={{ padding: "var(--spacing-sm)", textAlign: "right" }}
                >
                  Completed
                </th>
                <th
                  style={{ padding: "var(--spacing-sm)", textAlign: "right" }}
                >
                  Revenue (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {report.map((month) => (
                <tr
                  key={month.month}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td style={{ padding: "var(--spacing-md)", fontWeight: 600 }}>
                    {month.month}
                  </td>
                  <td
                    style={{
                      padding: "var(--spacing-md)",
                      textAlign: "right",
                      fontWeight: 600,
                    }}
                  >
                    {month.total}
                  </td>
                  <td
                    style={{ padding: "var(--spacing-md)", textAlign: "right" }}
                  >
                    {month.completed}
                  </td>
                  <td
                    style={{
                      padding: "var(--spacing-md)",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "var(--secondary)",
                    }}
                  >
                    ₹{month.revenue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================
// PATIENT RETENTION REPORT
// ============================================

function PatientRetentionReport() {
  const supabase = createClient();

  const { data: report, isLoading } = useSWR(
    "patient-retention-report",
    async () => {
      const user = await getAuthUser();
      if (!user) return null;

      const { data: pharmacy } = await supabase
        .from("pharmacies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!pharmacy) return null;

      // Get all schedules
      const { data: schedules } = await supabase
        .from("schedules")
        .select("id")
        .eq("pharmacy_id", pharmacy.id);

      if (!schedules) return null;

      const scheduleIds = schedules.map((s) => s.id);

      // Get all tokens with patient info
      const { data: tokens } = await supabase
        .from("tokens")
        .select("patient_id")
        .in("schedule_id", scheduleIds);

      // Count visits per patient
      const visitCount = {};
      tokens?.forEach((t) => {
        visitCount[t.patient_id] = (visitCount[t.patient_id] || 0) + 1;
      });

      // Get patient details
      const patientIds = Object.keys(visitCount);
      const { data: patients } = await supabase
        .from("patients")
        .select("id, name, phone")
        .in("id", patientIds);

      const newPatients =
        patients?.filter((p) => visitCount[p.id] === 1).length || 0;
      const repeatPatients =
        patients?.filter((p) => visitCount[p.id] > 1).length || 0;

      const topPatients = (patients || [])
        .map((p) => ({
          name: p.name,
          phone: p.phone,
          visits: visitCount[p.id],
        }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10);

      return {
        newPatients,
        repeatPatients,
        topPatients,
        totalPatients: patients?.length || 0,
      };
    },
  );

  const handleExportCSV = () => {
    if (!report?.topPatients?.length) return;
    const headers = ["Patient Name", "Phone", "Total Visits"];
    const rows = report.topPatients.map((p) => [p.name, p.phone, p.visits]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patient-retention-report.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
      >
        <Loader2 className="animate-spin" color="var(--primary)" size={32} />
      </div>
    );
  }

  const retentionRate =
    report?.totalPatients > 0
      ? Math.round((report.repeatPatients / report.totalPatients) * 100)
      : 0;

  return (
    <div>
      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "var(--spacing-md)",
          marginBottom: "var(--spacing-xl)",
        }}
      >
        <SummaryCard
          icon={<Users size={20} />}
          label="Total Patients"
          value={report?.totalPatients || 0}
          color="var(--primary)"
        />
        <SummaryCard
          icon={<Activity size={20} />}
          label="New Patients"
          value={report?.newPatients || 0}
          color="var(--secondary)"
        />
        <SummaryCard
          icon={<TrendingUp size={20} />}
          label="Repeat Patients"
          value={report?.repeatPatients || 0}
          color="var(--warning)"
        />
        <SummaryCard
          icon={<CheckCircle2 size={20} />}
          label="Retention Rate"
          value={`${retentionRate}%`}
          color="var(--secondary)"
        />
      </div>

      {/* Top Patients */}
      <div
        className="card glass-panel"
        style={{ padding: "0", overflow: "hidden" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "var(--spacing-md)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 800 }}>
            Top Loyal Patients
          </h3>
          <button
            onClick={handleExportCSV}
            disabled={!report?.topPatients?.length}
            className="btn btn-outline btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        {report?.topPatients?.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <Users
              size={48}
              style={{ marginBottom: "var(--spacing-md)", opacity: 0.5 }}
            />
            <p>No patient data available</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead style={{ backgroundColor: "var(--surface-hover)" }}>
                <tr>
                  <th style={{ padding: "var(--spacing-sm)" }}>Rank</th>
                  <th style={{ padding: "var(--spacing-sm)" }}>Patient Name</th>
                  <th style={{ padding: "var(--spacing-sm)" }}>Phone</th>
                  <th
                    style={{ padding: "var(--spacing-sm)", textAlign: "right" }}
                  >
                    Total Visits
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.topPatients.map((patient, idx) => (
                  <tr
                    key={idx}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td style={{ padding: "var(--spacing-md)" }}>
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          backgroundColor:
                            idx === 0
                              ? "#FFD700"
                              : idx === 1
                                ? "#C0C0C0"
                                : idx === 2
                                  ? "#CD7F32"
                                  : "var(--surface)",
                          color: idx < 3 ? "white" : "var(--text-main)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                          fontSize: "var(--text-sm)",
                        }}
                      >
                        {idx + 1}
                      </div>
                    </td>
                    <td
                      style={{ padding: "var(--spacing-md)", fontWeight: 600 }}
                    >
                      {patient.name}
                    </td>
                    <td
                      style={{
                        padding: "var(--spacing-md)",
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      {patient.phone}
                    </td>
                    <td
                      style={{
                        padding: "var(--spacing-md)",
                        textAlign: "right",
                        fontWeight: 700,
                        color: "var(--primary)",
                      }}
                    >
                      {patient.visits}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// PAYMENT COLLECTION REPORT
// ============================================

function PaymentCollectionReport() {
  const supabase = createClient();

  const { data: report, isLoading } = useSWR(
    "payment-collection-report",
    async () => {
      const user = await getAuthUser();
      if (!user) return null;

      const { data: pharmacy } = await supabase
        .from("pharmacies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!pharmacy) return null;

      // Get all schedules
      const { data: schedules } = await supabase
        .from("schedules")
        .select("id")
        .eq("pharmacy_id", pharmacy.id);

      if (!schedules) return null;

      const scheduleIds = schedules.map((s) => s.id);

      // Get all tokens
      const { data: tokens } = await supabase
        .from("tokens")
        .select("payment_method, payment_status, created_at")
        .in("schedule_id", scheduleIds);

      // Group by payment method
      const paymentMethods = { cash: 0, upi: 0 };
      const monthlyRevenue = {};

      tokens?.forEach((token) => {
        if (token.payment_status === "paid") {
          if (token.payment_method === "cash") paymentMethods.cash++;
          if (token.payment_method === "upi") paymentMethods.upi++;

          const month = new Date(token.created_at).toLocaleString("default", {
            month: "short",
            year: "2-digit",
          });
          if (!monthlyRevenue[month]) monthlyRevenue[month] = 0;
          monthlyRevenue[month] += 50;
        }
      });

      const totalRevenue = (paymentMethods.cash + paymentMethods.upi) * 50;
      const pendingCount =
        tokens?.filter(
          (t) =>
            token.payment_status === "requested" ||
            token.payment_status === "pending",
        ).length || 0;

      return {
        paymentMethods,
        totalRevenue,
        monthlyRevenue: Object.entries(monthlyRevenue).map(
          ([month, revenue]) => ({ month, revenue }),
        ),
        pendingCount,
      };
    },
  );

  const handleExportCSV = () => {
    if (!report) return;
    const headers = ["Payment Method", "Count", "Amount (₹)"];
    const rows = [
      ["Cash", report.paymentMethods.cash, report.paymentMethods.cash * 50],
      ["UPI", report.paymentMethods.upi, report.paymentMethods.upi * 50],
      [
        "Total",
        report.paymentMethods.cash + report.paymentMethods.upi,
        report.totalRevenue,
      ],
    ];
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-collection-report.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
      >
        <Loader2 className="animate-spin" color="var(--primary)" size={32} />
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "var(--spacing-md)",
          marginBottom: "var(--spacing-xl)",
        }}
      >
        <SummaryCard
          icon={<DollarSign size={20} />}
          label="Total Revenue"
          value={`₹${report?.totalRevenue || 0}`}
          color="var(--secondary)"
        />
        <SummaryCard
          icon={<Activity size={20} />}
          label="Cash Payments"
          value={report?.paymentMethods.cash || 0}
          color="var(--primary)"
        />
        <SummaryCard
          icon={<Activity size={20} />}
          label="UPI Payments"
          value={report?.paymentMethods.upi || 0}
          color="var(--warning)"
        />
        <SummaryCard
          icon={<Clock size={20} />}
          label="Pending"
          value={report?.pendingCount || 0}
          color="var(--danger)"
        />
      </div>

      {/* Payment Method Breakdown */}
      <div
        className="card glass-panel"
        style={{ padding: "0", overflow: "hidden" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "var(--spacing-md)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 800 }}>
            Payment Method Breakdown
          </h3>
          <button
            onClick={handleExportCSV}
            className="btn btn-outline btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div style={{ padding: "var(--spacing-lg)" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "var(--spacing-lg)",
            }}
          >
            <div
              style={{
                textAlign: "center",
                padding: "var(--spacing-lg)",
                backgroundColor: "var(--surface)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <div
                style={{
                  fontSize: "3rem",
                  fontWeight: 900,
                  color: "var(--primary)",
                  marginBottom: "var(--spacing-xs)",
                }}
              >
                {report?.paymentMethods.cash || 0}
              </div>
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                Cash Payments
              </div>
              <div
                style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: 700,
                  color: "var(--secondary)",
                  marginTop: "var(--spacing-sm)",
                }}
              >
                ₹{(report?.paymentMethods.cash || 0) * 50}
              </div>
            </div>

            <div
              style={{
                textAlign: "center",
                padding: "var(--spacing-lg)",
                backgroundColor: "var(--surface)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <div
                style={{
                  fontSize: "3rem",
                  fontWeight: 900,
                  color: "var(--warning)",
                  marginBottom: "var(--spacing-xs)",
                }}
              >
                {report?.paymentMethods.upi || 0}
              </div>
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                UPI Payments
              </div>
              <div
                style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: 700,
                  color: "var(--secondary)",
                  marginTop: "var(--spacing-sm)",
                }}
              >
                ₹{(report?.paymentMethods.upi || 0) * 50}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function SummaryCard({ icon, label, value, color }) {
  return (
    <div className="card glass-panel" style={{ padding: "var(--spacing-md)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-sm)",
          marginBottom: "var(--spacing-xs)",
        }}
      >
        <div style={{ color }}>{icon}</div>
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: "var(--text-2xl)",
          fontWeight: 900,
          color: "var(--text-main)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
