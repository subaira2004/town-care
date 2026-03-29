"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Users,
  Search,
  Plus,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  UserPlus,
  UserCheck,
  X,
  User,
  AlertCircle,
  Share2,
  MessageCircle,
  Smartphone,
  Copy,
  Archive,
} from "lucide-react";
import {
  getTodayDate,
  generateStatusUrl,
  getWhatsAppUrl,
  getSmsUrl,
  formatPhone,
  isValidPhone,
} from "@/lib/utils";
import { getAuthUser } from "@/app/actions/auth";
import { t, getShareMessage, getStatusLabel } from "@/lib/i18n/translations";
import "./queue-page.css";

function QueueContent() {
  const [loading, setLoading] = useState(true);
  const [pharmacy, setPharmacy] = useState(null);
  const [schedules, setSchedules] = useState([]); // For booking (any date)
  const [todaysSchedules, setTodaysSchedules] = useState([]); // For queue management (today only)
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedScheduleId, setSelectedScheduleId] = useState(""); // For queue management (today)
  const [bookingScheduleId, setBookingScheduleId] = useState(""); // For booking form
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [tokens, setTokens] = useState([]);

  // Patient search state
  const [searchTerm, setSearchTerm] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    name: "",
    phone: "",
    relation: "Self",
  });
  const [appointmentTime, setAppointmentTime] = useState("");
  const [bookingType, setBookingType] = useState("walk_in");
  const [addingToken, setAddingToken] = useState(false);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [copied, setCopied] = useState(false);

  const searchParams = useSearchParams();
  const initialScheduleParam = searchParams.get("schedule");
  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, [selectedDate]);

  useEffect(() => {
    if (selectedScheduleId) {
      const sched = todaysSchedules.find((s) => s.id === selectedScheduleId);
      setSelectedSchedule(sched);
      fetchTokens(selectedScheduleId);
    } else {
      setSelectedSchedule(null);
      setTokens([]);
    }
  }, [selectedScheduleId, todaysSchedules]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 3) {
        handleSearch();
      } else if (searchTerm.length === 0) {
        setPatientResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearch = async () => {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(5);
    setPatientResults(data || []);
  };

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
      // Fetch schedules for selected date (for booking)
      const { data: scheds } = await supabase
        .from("schedules")
        .select("*, doctors(name)")
        .eq("pharmacy_id", pData.id)
        .eq("schedule_date", selectedDate);
      setSchedules(scheds || []);

      // Set booking schedule to first available for selected date
      if (scheds && scheds.length > 0) {
        setBookingScheduleId(scheds[0].id);
      } else {
        setBookingScheduleId("");
      }

      // Fetch today's schedules separately (for queue management)
      const today = getTodayDate();
      const { data: todayScheds } = await supabase
        .from("schedules")
        .select("*, doctors(name)")
        .eq("pharmacy_id", pData.id)
        .eq("schedule_date", today);
      setTodaysSchedules(todayScheds || []);

      // Set selected schedule from today's schedules for queue management
      if (todayScheds && todayScheds.length > 0) {
        if (
          initialScheduleParam &&
          todayScheds.some((s) => s.id === initialScheduleParam)
        ) {
          setSelectedScheduleId(initialScheduleParam);
        } else if (
          !selectedScheduleId ||
          !todayScheds.some((s) => s.id === selectedScheduleId)
        ) {
          setSelectedScheduleId(todayScheds[0].id);
        }
      } else {
        setSelectedScheduleId("");
      }
    }
    setLoading(false);
  };

  const fetchTokens = async (schedId) => {
    const { data } = await supabase
      .from("tokens")
      .select("*, patients(phone, name)")
      .eq("schedule_id", schedId)
      .order("appointment_time", { ascending: true })
      .order("token_number", { ascending: true });
    setTokens(data || []);
  };

  const handleAddToken = async (e) => {
    e.preventDefault();
    setAddingToken(true);
    let patientId = selectedPatient?.id;
    if (isNewPatient || !patientId) {
      const formattedPhone = formatPhone(newPatientData.phone);
      if (!isValidPhone(formattedPhone)) {
        alert(t("invalidNumber", pharmacy.language));
        setAddingToken(false);
        return;
      }
      const { data: created } = await supabase
        .from("patients")
        .insert([
          {
            phone: formattedPhone,
            name: newPatientData.name,
            relation: newPatientData.relation || "Self",
            town_name: pharmacy.town_name,
          },
        ])
        .select();
      if (created?.[0]) patientId = created[0].id;
    }
    if (patientId && bookingScheduleId) {
      // Get tokens for the booking schedule to calculate max token
      const { data: bookingTokens } = await supabase
        .from("tokens")
        .select("token_number")
        .eq("schedule_id", bookingScheduleId);
      const maxToken = bookingTokens
        ? bookingTokens.reduce((max, t) => Math.max(max, t.token_number), 0)
        : 0;
      await supabase.from("tokens").insert([
        {
          schedule_id: bookingScheduleId,
          patient_id: patientId,
          token_number: maxToken + 1,
          booking_type: bookingType,
          appointment_time: appointmentTime || null,
          status: "waiting",
        },
      ]);
      resetBookingForm();
      fetchInitialData();
    }
    setAddingToken(false);
  };

  const resetBookingForm = () => {
    setSearchTerm("");
    setPatientResults([]);
    setIsNewPatient(false);
    setSelectedPatient(null);
    setNewPatientData({ name: "", phone: "", relation: "Self" });
    setAppointmentTime("");
    setBookingScheduleId("");
  };

  const handleEndOfDay = async () => {
    if (!selectedScheduleId) return;

    if (
      !confirm(
        'Mark all incomplete tokens as "Unattended" for this schedule? This cannot be undone.',
      )
    ) {
      return;
    }

    setLoading(true);

    // Update all waiting and in_consultation tokens to unattended
    const { error } = await supabase
      .from("tokens")
      .update({ status: "unattended" })
      .eq("schedule_id", selectedScheduleId)
      .in("status", ["waiting", "in_consultation"]);

    if (error) {
      alert("Error marking tokens as unattended: " + error.message);
    } else {
      alert("All incomplete tokens marked as Unattended!");
      fetchTokens(selectedScheduleId);
    }

    setLoading(false);
  };

  const handleShare = (token) => {
    setSelectedToken(token);
    setShowShareModal(true);
  };

  const getShareMessageForToken = (token) => {
    const statusLink = generateStatusUrl(token.id);
    const status = getStatusLabel(token.status, pref);
    return getShareMessage(pref, {
      pharmacyName: pharmacy?.name || "",
      doctorName: selectedSchedule?.doctors?.name || "",
      tokenNumber: token.token_number.toString(),
      status,
      statusLink,
    });
  };

  const handleCopyMessage = () => {
    const message = getShareMessageForToken(selectedToken);
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const message = getShareMessageForToken(selectedToken);
    // Get patient phone number and format it for WhatsApp (remove + and spaces)
    const patientPhone =
      selectedToken.patients?.phone?.replace(/\D/g, "") || "";
    // Format: remove country code if present, then add 91 for India
    const formattedPhone = patientPhone.startsWith("91")
      ? patientPhone
      : patientPhone.startsWith("0")
        ? "91" + patientPhone.slice(1)
        : "91" + patientPhone;

    // Use wa.me with phone number to open direct chat
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleSmsShare = () => {
    const message = getShareMessageForToken(selectedToken);
    const url = getSmsUrl(message);
    window.location.href = url;
  };

  const generateSlots = (schedule) => {
    if (!schedule) return [];
    const slots = [];
    const [startH, startM] = schedule.start_time.split(":").map(Number);
    const [endH, endM] = schedule.end_time.split(":").map(Number);
    const interval = schedule.avg_consultation_minutes || 15;
    let current = new Date();
    current.setHours(startH, startM, 0, 0);
    const end = new Date();
    end.setHours(endH, endM, 0, 0);
    while (current < end) {
      const timeStr = current.toTimeString().slice(0, 5);
      const isBooked = tokens.some((t) =>
        t.appointment_time?.startsWith(timeStr),
      );
      slots.push({ time: timeStr, booked: isBooked });
      current.setMinutes(current.getMinutes() + interval);
    }
    return slots;
  };

  // Get the booking schedule for the slot generator
  const bookingSchedule = schedules.find((s) => s.id === bookingScheduleId);

  const pref = pharmacy?.language || "en";
  if (loading)
    return (
      <div
        style={{ display: "flex", justifyContent: "center", marginTop: "4rem" }}
      >
        <Loader2 className="animate-spin" color="var(--primary)" size={32} />
      </div>
    );

  const phoneValidForNew = isValidPhone(newPatientData.phone);

  return (
    <div className="queue-container">
      <div className="queue-layout">
        {/* LEFT: QUEUE LIST */}
        <div className="queue-list-section">
          <div className="queue-header">
            <div>
              <h1 className="queue-title">{t("tokenQueue", pref)}</h1>
              <p className="queue-date">
                {new Date(getTodayDate()).toLocaleDateString(
                  pref === "ta" ? "ta-IN" : "en-IN",
                  { weekday: "long", month: "long", day: "numeric" },
                )}
              </p>
            </div>
            <select
              className="schedule-selector"
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
            >
              {todaysSchedules.length > 0 ? (
                todaysSchedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    Dr. {s.doctors?.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  {t("noSchedulesForToday", pref)}
                </option>
              )}
            </select>

            {selectedScheduleId && (
              <button
                onClick={handleEndOfDay}
                className="btn btn-outline"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  borderColor: "var(--danger)",
                  color: "var(--danger)",
                }}
                title="Mark all incomplete tokens as unattended"
              >
                <Archive size={16} />
                End of Day
              </button>
            )}
          </div>

          <div className="token-list">
            <div className="token-list-header">
              <div>#</div>
              <div>Patient</div>
              <div>Time</div>
              <div>Actions</div>
            </div>

            <div
              style={{
                padding: "var(--spacing-md)",
                backgroundColor: "var(--background)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "var(--text-lg)",
                  color: "var(--primary)",
                }}
              >
                {selectedSchedule
                  ? `Dr. ${selectedSchedule.doctors?.name}`
                  : t("selectDoctor", pref)}
              </div>
              {selectedSchedule && (
                <div className="badge badge-active">
                  <Clock size={14} style={{ marginRight: "4px" }} />
                  {selectedSchedule.start_time.slice(0, 5)} -{" "}
                  {selectedSchedule.end_time.slice(0, 5)}
                </div>
              )}
            </div>

            <div>
              {tokens.length === 0 ? (
                <div className="empty-state">
                  <Users className="empty-state-icon" />
                  <div className="empty-state-text">{t("noTokens", pref)}</div>
                </div>
              ) : (
                tokens.map((token) => (
                  <div
                    key={token.id}
                    className="token-card animate-fade-in"
                    style={{
                      backgroundColor:
                        token.status === "in_consultation"
                          ? "rgba(79, 70, 229, 0.05)"
                          : "var(--surface)",
                    }}
                  >
                    <div className="token-card-content">
                      <div
                        className="token-number-badge"
                        style={{
                          backgroundColor:
                            token.status === "completed"
                              ? "var(--text-muted)"
                              : token.status === "unattended"
                                ? "var(--danger)"
                                : "var(--primary)",
                        }}
                      >
                        {token.token_number}
                      </div>
                      <div className="token-card-info">
                        <div className="token-card-name">
                          {token.patients?.name}
                        </div>
                        <div className="token-card-meta">
                          <span className="token-card-phone">
                            <Phone size={14} /> {token.patients?.phone}
                          </span>
                          {token.appointment_time && (
                            <span className="token-card-time">
                              <Clock size={16} />{" "}
                              {token.appointment_time.slice(0, 5)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="token-card-actions">
                      {token.status === "waiting" && (
                        <button
                          onClick={() =>
                            supabase
                              .from("tokens")
                              .update({ status: "in_consultation" })
                              .eq("id", token.id)
                              .then(() => fetchTokens(selectedScheduleId))
                          }
                          className="btn btn-secondary shadow-sm"
                          style={{ padding: "0.8rem 1.75rem", fontWeight: 800 }}
                        >
                          {t("startConsultation", pref).toUpperCase()}
                        </button>
                      )}
                      {token.status === "in_consultation" && (
                        <button
                          onClick={() =>
                            supabase
                              .from("tokens")
                              .update({ status: "completed" })
                              .eq("id", token.id)
                              .then(() => fetchTokens(selectedScheduleId))
                          }
                          className="btn btn-primary shadow-sm"
                          style={{ padding: "0.8rem 1.75rem", fontWeight: 800 }}
                        >
                          {t("completeToken", pref).toUpperCase()}
                        </button>
                      )}
                      <button
                        onClick={() => handleShare(token)}
                        className="btn btn-outline"
                        style={{
                          padding: "0.8rem",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <Share2 size={16} /> {t("shareViaWhatsApp", pref)}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: SEARCH & BOOKING SIDEPANEL */}
        <div className="booking-section">
          <div className="card glass-panel booking-panel">
            <h2 className="booking-title">
              <UserPlus size={32} /> {t("addToken", pref)}
            </h2>

            {/* BOOKING TYPE - FIRST STEP */}
            <div className="form-group booking-form-group">
              <label className="form-label booking-label">
                1. {t("bookingType", pref).toUpperCase()}
              </label>
              <div className="booking-type-container">
                <button
                  type="button"
                  onClick={() => setBookingType("walk_in")}
                  className={`booking-type-btn ${bookingType === "walk_in" ? "active" : ""}`}
                >
                  <UserCheck
                    size={32}
                    color={
                      bookingType === "walk_in"
                        ? "var(--secondary)"
                        : "var(--text-muted)"
                    }
                  />
                  {t("walkIn", pref)}
                  {bookingType === "walk_in" && (
                    <span className="booking-type-hint">
                      {t("patientIsPresent", pref)}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setBookingType("phone")}
                  className={`booking-type-btn ${bookingType === "phone" ? "active" : ""}`}
                >
                  <Phone
                    size={32}
                    color={
                      bookingType === "phone"
                        ? "var(--secondary)"
                        : "var(--text-muted)"
                    }
                  />
                  {t("phoneBooking", pref)}
                  {bookingType === "phone" && (
                    <span className="booking-type-hint">
                      {t("futureAppointment", pref)}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* SEARCH PATIENT */}
            <div className="form-group booking-form-group">
              <label className="form-label booking-label">
                2. {t("searchNamePhone", pref).toUpperCase()}
              </label>
              <div className="search-input-wrapper">
                <Search size={24} className="search-icon" />
                <input
                  type="text"
                  className="form-input booking-search-input"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (e.target.value.length === 0) resetBookingForm();
                  }}
                  placeholder={t("search", pref) + "..."}
                />
                {searchTerm.length > 0 && (
                  <button
                    onClick={resetBookingForm}
                    className="clear-search-btn"
                  >
                    <X size={28} />
                  </button>
                )}
              </div>
            </div>

            {/* SEARCH RESULTS */}
            {searchTerm.length >= 3 && (
              <div className="animate-fade-in patient-results-container">
                <label className="patient-result-label">
                  3. {t("chooseProfile", pref).toUpperCase()}
                </label>
                {patientResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPatient(p);
                      setIsNewPatient(false);
                      setSearchTerm(p.name);
                    }}
                    className={`patient-result-btn ${selectedPatient?.id === p.id ? "selected" : ""}`}
                  >
                    <div className="patient-icon">
                      <User size={24} />
                    </div>
                    <div className="patient-result-info">
                      <div className="patient-result-name">{p.name}</div>
                      <div className="patient-result-phone">{p.phone}</div>
                    </div>
                  </button>
                ))}

                <button
                  onClick={() => {
                    setIsNewPatient(true);
                    setSelectedPatient(null);
                    setNewPatientData({
                      ...newPatientData,
                      name: searchTerm.match(/[A-Za-z]/) ? searchTerm : "",
                      phone: searchTerm.match(/\d/) ? searchTerm : "",
                    });
                  }}
                  className={`new-patient-btn ${isNewPatient ? "active" : ""}`}
                >
                  <div className="patient-icon">
                    <Plus size={28} />
                  </div>
                  <div>
                    <div className="new-patient-btn-title">
                      {t("addNewProfile", pref)}
                    </div>
                    <div className="new-patient-btn-hint">
                      ({t("optional", pref)})
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* CREATION FORM FOR NEW PATIENT */}
            {isNewPatient && (
              <div className="animate-fade-in new-patient-form-container">
                <div className="form-group">
                  <label className="form-label">
                    {t("patientName", pref).toUpperCase()}
                  </label>
                  <input
                    type="text"
                    className="form-input patient-name-input"
                    value={newPatientData.name}
                    onChange={(e) =>
                      setNewPatientData({
                        ...newPatientData,
                        name: e.target.value,
                      })
                    }
                    placeholder={t("patientName", pref)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <span>{t("phone", pref).toUpperCase()}</span>
                    {newPatientData.phone && !phoneValidForNew && (
                      <span className="phone-validation-text error">
                        {t("enterTenDigits", pref)}
                      </span>
                    )}
                    {phoneValidForNew && (
                      <span className="phone-validation-text success">
                        {t("validNumber", pref)}
                      </span>
                    )}
                  </label>
                  <div className="phone-input-wrapper">
                    <span className="phone-prefix">+91</span>
                    <input
                      type="tel"
                      className="form-input patient-phone-input"
                      value={newPatientData.phone}
                      onChange={(e) =>
                        setNewPatientData({
                          ...newPatientData,
                          phone: e.target.value,
                        })
                      }
                      placeholder="XXXXX XXXXX"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3/4: DOCTOR & SLOT SELECTION (Only for Phone Booking) */}
            {(selectedPatient || isNewPatient) && bookingType === "phone" && (
              <div className="animate-fade-in booking-phone-section">
                <div className="form-group">
                  <label className="form-label booking-label">
                    3. {t("appointmentDate", pref).toUpperCase()}
                  </label>
                  <div className="date-input-wrapper">
                    <Calendar size={18} className="date-icon" />
                    <input
                      type="date"
                      className="form-input booking-date-input"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setBookingScheduleId("");
                        setAppointmentTime("");
                      }}
                      min={getTodayDate()}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label booking-label">
                    4. {t("selectDoctor", pref).toUpperCase()}
                  </label>
                  <div className="doctor-select-wrapper">
                    <select
                      className="form-select booking-doctor-select"
                      value={bookingScheduleId}
                      onChange={(e) => {
                        setBookingScheduleId(e.target.value);
                        setAppointmentTime("");
                      }}
                    >
                      {schedules.length > 0 ? (
                        schedules.map((s) => (
                          <option key={s.id} value={s.id}>
                            Dr. {s.doctors?.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          {t("noSchedulesForDate", pref)}
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                {bookingSchedule && (
                  <div className="form-group">
                    <label className="form-label booking-label">
                      5. {t("availableSlots", pref).toUpperCase()}
                    </label>
                    <div className="time-slot-grid">
                      {generateSlots(bookingSchedule).map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={slot.booked}
                          onClick={() => setAppointmentTime(slot.time)}
                          className={`time-slot-btn ${slot.booked ? "booked" : ""} ${appointmentTime === slot.time ? "selected" : ""}`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3/4: SELECT SCHEDULE (For Walk-in - Today Only) */}
            {(selectedPatient || isNewPatient) && bookingType === "walk_in" && (
              <div className="form-group">
                <label className="form-label booking-label">
                  3. {t("selectDoctor", pref).toUpperCase()}
                </label>
                <div className="doctor-select-wrapper">
                  <select
                    className="form-select booking-doctor-select"
                    value={bookingScheduleId}
                    onChange={(e) => setBookingScheduleId(e.target.value)}
                  >
                    {todaysSchedules.length > 0 ? (
                      todaysSchedules.map((s) => (
                        <option key={s.id} value={s.id}>
                          Dr. {s.doctors?.name} - {s.start_time.slice(0, 5)} to{" "}
                          {s.end_time.slice(0, 5)}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        {t("noSchedulesForToday", pref)}
                      </option>
                    )}
                  </select>
                </div>
                <p className="booking-hint">{t("walkInForTodayOnly", pref)}</p>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            {(selectedPatient || isNewPatient) && bookingScheduleId && (
              <button
                type="submit"
                onClick={handleAddToken}
                className="btn btn-primary generate-token-btn"
                disabled={
                  addingToken ||
                  !bookingScheduleId ||
                  (isNewPatient && !phoneValidForNew) ||
                  (bookingType === "phone" && !appointmentTime)
                }
              >
                {addingToken ? (
                  <Loader2 size={36} className="animate-spin" />
                ) : (
                  <>
                    {t("generateToken", pref).toUpperCase()}
                    <CheckCircle2 size={36} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SHARE MODAL */}
      {showShareModal && selectedToken && (
        <div
          className="share-modal-overlay"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="card glass-panel share-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="share-modal-header">
              <h2 className="share-modal-title">
                <Share2 size={28} /> {t("shareTitle", pref)}
              </h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="share-modal-close"
              >
                <X size={24} />
              </button>
            </div>

            {/* Token Info Summary */}
            <div className="share-token-info">
              <div className="share-token-label">{t("patientName", pref)}</div>
              <div className="share-patient-name">
                {selectedToken.patients?.name}
              </div>
              <div className="share-phone">
                <Phone size={16} color="var(--primary)" />
                {selectedToken.patients?.phone}
              </div>
              <div className="share-token-meta">
                <span>
                  {t("tokenNumber", pref)}: #{selectedToken.token_number}
                </span>
                <span>•</span>
                <span>{getStatusLabel(selectedToken.status, pref)}</span>
              </div>
            </div>

            {/* Message Preview */}
            <div className="share-message-preview">
              <label className="share-message-label">
                {t("shareMessage", pref) || "Message Preview"}
              </label>
              <div className="share-message-text">
                {getShareMessageForToken(selectedToken)}
              </div>
            </div>

            {/* Share Buttons */}
            <div className="share-buttons">
              <button
                onClick={handleWhatsAppShare}
                className="btn share-btn whatsapp"
              >
                <MessageCircle size={22} />
                <div className="share-btn-text">
                  <span>{t("shareViaWhatsApp", pref)}</span>
                  <span className="share-btn-hint">
                    Opens chat with {selectedToken.patients?.name}
                  </span>
                </div>
              </button>

              <button onClick={handleSmsShare} className="btn share-btn sms">
                <Smartphone size={22} /> {t("shareViaSms", pref)}
              </button>

              <button
                onClick={handleCopyMessage}
                className="btn share-btn copy"
              >
                <Copy size={20} />{" "}
                {copied ? t("messageCopied", pref) : t("copyMessage", pref)}
                {copied && (
                  <CheckCircle2
                    size={18}
                    color="var(--secondary)"
                    className="copy-check-icon"
                  />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense>
      <QueueContent />
    </Suspense>
  );
}
