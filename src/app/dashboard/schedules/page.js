"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Calendar,
  Plus,
  Trash2,
  Clock,
  User,
  ChevronLeft,
  Save,
  AlertCircle,
  Repeat,
  Copy,
} from "lucide-react";
import { getTodayDate } from "@/lib/utils";
import { getAuthUser } from "@/app/actions/auth";
import { t } from "@/lib/i18n/translations";
import Link from "next/link";

export default function SchedulesPage() {
  const [loading, setLoading] = useState(true);
  const [pharmacy, setPharmacy] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [showForm, setShowForm] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    doctor_id: "",
    start_time: "09:00",
    end_time: "13:00",
    avg_consultation_minutes: 15,
    repeat_weeks: 4,
    days: [], // for bulk
  });

  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, [selectedDate]);

  const fetchInitialData = async () => {
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
      const { data: drs } = await supabase
        .from("pharmacy_doctors")
        .select("doctor_id")
        .eq("pharmacy_id", pData.id);
      const linkedDoctorIds = drs?.map((d) => d.doctor_id) || [];
      const { data: allDocs } = await supabase
        .from("doctors")
        .select("*")
        .in("id", linkedDoctorIds);
      setDoctors(allDocs || []);
      const { data: scheds } = await supabase
        .from("schedules")
        .select("*, doctors(name)")
        .eq("pharmacy_id", pData.id)
        .eq("schedule_date", selectedDate);
      setSchedules(scheds || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (bulkMode) {
        const batch = [];
        const start = new Date(selectedDate);
        for (let i = 0; i < formData.repeat_weeks * 7; i++) {
          const current = new Date(start);
          current.setDate(start.getDate() + i);
          const dayName = current.toLocaleDateString("en-US", {
            weekday: "long",
          });
          if (formData.days.includes(dayName)) {
            batch.push({
              pharmacy_id: pharmacy.id,
              doctor_id: formData.doctor_id,
              schedule_date: current.toISOString().split("T")[0],
              start_time: formData.start_time,
              end_time: formData.end_time,
              avg_consultation_minutes: formData.avg_consultation_minutes || 15,
            });
          }
        }
        await supabase.from("schedules").insert(batch);
      } else {
        await supabase.from("schedules").insert([
          {
            pharmacy_id: pharmacy.id,
            doctor_id: formData.doctor_id,
            schedule_date: selectedDate,
            start_time: formData.start_time,
            end_time: formData.end_time,
            avg_consultation_minutes: formData.avg_consultation_minutes || 15,
          },
        ]);
      }
      setShowForm(false);
      fetchInitialData();
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  };

  const pref = pharmacy?.language || "en";

  if (loading && !showForm)
    return (
      <div
        style={{ display: "flex", justifyContent: "center", marginTop: "4rem" }}
      >
        <Loader2 className="animate-spin" color="var(--primary)" size={32} />
      </div>
    );

  if (showForm) {
    return (
      <div
        className="animate-fade-in"
        style={{ maxWidth: "800px", margin: "0 auto" }}
      >
        <button
          onClick={() => setShowForm(false)}
          className="btn btn-outline"
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <ChevronLeft size={20} /> {t("backToCalendar", pref)}
        </button>

        <div
          className="card glass-panel shadow-xl"
          style={{ padding: "3rem", borderRadius: "2rem" }}
        >
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 950,
              marginBottom: "2.5rem",
              color: "var(--primary)",
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
            }}
          >
            {bulkMode ? <Repeat size={32} /> : <Plus size={32} />}
            {bulkMode ? t("bulkSetup", pref) : t("newSession", pref)}
          </h1>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            <div className="form-group">
              <label className="form-label">{t("selectDoctor", pref)}</label>
              <select
                className="form-select"
                required
                value={formData.doctor_id}
                onChange={(e) =>
                  setFormData({ ...formData, doctor_id: e.target.value })
                }
              >
                <option value="">-- {t("selectDoctor", pref)} --</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
              }}
            >
              <div className="form-group">
                <label className="form-label">{t("startTime", pref)}</label>
                <input
                  type="time"
                  className="form-input"
                  required
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("endTime", pref)}</label>
                <input
                  type="time"
                  className="form-input"
                  required
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                />
              </div>
            </div>

            {bulkMode && (
              <div
                className="animate-fade-in"
                style={{
                  padding: "2rem",
                  backgroundColor: "var(--background)",
                  borderRadius: "1.5rem",
                  border: "1px solid var(--border)",
                }}
              >
                <label
                  className="form-label"
                  style={{ marginBottom: "1.5rem", display: "block" }}
                >
                  {t("repeatWeekly", pref)}
                </label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const newDays = formData.days.includes(day)
                          ? formData.days.filter((d) => d !== day)
                          : [...formData.days, day];
                        setFormData({ ...formData, days: newDays });
                      }}
                      className={`btn btn-sm ${formData.days.includes(day) ? "btn-primary" : "btn-outline"}`}
                      style={{ borderRadius: "0.75rem" }}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {t("totalDuration", pref)} (Weeks)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.repeat_weeks}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        repeat_weeks: parseInt(e.target.value),
                      })
                    }
                    max={12}
                    min={1}
                  />
                </div>
              </div>
            )}

            {!bulkMode && (
              <div className="form-group">
                <label className="form-label">
                  {t("avgConsultation", pref)}
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.avg_consultation_minutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      avg_consultation_minutes: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
              <button
                type="button"
                onClick={() => setBulkMode(!bulkMode)}
                className="btn btn-outline"
                style={{ flex: 1, padding: "1.25rem" }}
              >
                {bulkMode
                  ? t("single", pref) || "Single Day"
                  : t("bulkSetup", pref)}
              </button>
              <button
                type="submit"
                className="btn btn-primary shadow-lg"
                style={{
                  flex: 2,
                  padding: "1.25rem",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                }}
              >
                {t("save", pref).toUpperCase()}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in schedules-page">
      <div className="schedules-header">
        <div>
          <h1 className="schedules-title">{t("schedules", pref)}</h1>
          <p className="schedules-date">
            {new Date(selectedDate).toLocaleDateString(
              pref === "ta" ? "ta-IN" : "en-IN",
              { month: "long", day: "numeric", year: "numeric" },
            )}
          </p>
        </div>
        <div className="schedules-actions">
          <input
            type="date"
            className="date-picker"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button
            onClick={() => {
              setBulkMode(false);
              setShowForm(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={20} /> {t("newSession", pref)}
          </button>
        </div>
      </div>

      <div className="schedules-grid">
        {schedules.length === 0 ? (
          <div
            className="card glass-panel"
            style={{
              padding: "3rem 1.5rem",
              textAlign: "center",
              opacity: 0.6,
            }}
          >
            <Calendar size={56} style={{ margin: "0 auto 1.5rem" }} />
            <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>
              {t("noSchedules", pref)}
            </div>
          </div>
        ) : (
          schedules.map((s) => (
            <div
              key={s.id}
              className="schedule-card card glass-panel animate-fade-in"
            >
              <div className="schedule-card-header">
                <div>
                  <h3 className="schedule-doctor-name">
                    Dr. {s.doctors?.name}
                  </h3>
                  <div className="schedule-time">
                    <Clock size={16} /> {s.start_time.slice(0, 5)} -{" "}
                    {s.end_time.slice(0, 5)}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (confirm(t("confirm", pref))) {
                      await supabase.from("schedules").delete().eq("id", s.id);
                      fetchInitialData();
                    }
                  }}
                  className="btn schedule-delete-btn"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="schedule-info">
                <div className="schedule-info-label">
                  {t("avgConsultation", pref).toUpperCase()}
                </div>
                <div className="schedule-info-value">
                  {s.avg_consultation_minutes} {t("minutes", pref)}
                </div>
              </div>
              <Link
                href={`/dashboard/queue?schedule=${s.id}`}
                className="btn btn-primary schedule-manage-btn"
              >
                {t("manageQueue", pref).toUpperCase()}
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
