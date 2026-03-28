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
    <div
      className="animate-fade-in"
      style={{ maxWidth: "1400px", margin: "0 auto" }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "2.5rem" }}>
        {/* LEFT: QUEUE LIST */}
        <div style={{ flex: "1 1 700px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2.5rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "2.5rem",
                  fontWeight: "900",
                  color: "var(--text-main)",
                  marginBottom: "0.25rem",
                }}
              >
                {t("tokenQueue", pref)}
              </h1>
              <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                {new Date(getTodayDate()).toLocaleDateString(
                  pref === "ta" ? "ta-IN" : "en-IN",
                  { weekday: "long", month: "long", day: "numeric" },
                )}
              </p>
            </div>
            <select
              className="form-select shadow-sm"
              style={{
                width: "auto",
                minWidth: "240px",
                height: "3.5rem",
                borderRadius: "1rem",
                border: "2px solid var(--primary)",
                color: "var(--text-main)",
                backgroundColor: "var(--surface)",
                fontWeight: 700,
              }}
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
          </div>

          <div
            className="card glass-panel shadow-lg"
            style={{ padding: "0", overflow: "hidden" }}
          >
            <div
              style={{
                padding: "2rem",
                backgroundColor: "var(--background)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: "1.75rem",
                  color: "var(--primary)",
                }}
              >
                {selectedSchedule
                  ? `Dr. ${selectedSchedule.doctors?.name}`
                  : t("selectDoctor", pref)}
              </div>
              {selectedSchedule && (
                <div
                  className="badge badge-active"
                  style={{ fontSize: "1rem", padding: "0.75rem 1.5rem" }}
                >
                  <Clock size={18} style={{ marginRight: "0.5rem" }} />{" "}
                  {selectedSchedule.start_time.slice(0, 5)} -{" "}
                  {selectedSchedule.end_time.slice(0, 5)}
                </div>
              )}
            </div>

            <div style={{ padding: "2rem" }}>
              {tokens.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "6rem 1rem",
                    opacity: 0.6,
                  }}
                >
                  <Users
                    size={72}
                    style={{
                      margin: "0 auto 1.5rem",
                      color: "var(--text-main)",
                    }}
                  />
                  <div
                    style={{
                      color: "var(--text-main)",
                      fontSize: "1.5rem",
                      fontWeight: 800,
                    }}
                  >
                    {t("noTokens", pref)}
                  </div>
                </div>
              ) : (
                tokens.map((token) => (
                  <div
                    key={token.id}
                    className="animate-fade-in"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "1.75rem",
                      border: "1px solid var(--border)",
                      borderRadius: "1.25rem",
                      marginBottom: "1.25rem",
                      backgroundColor:
                        token.status === "in_consultation"
                          ? "rgba(79, 70, 229, 0.05)"
                          : "var(--surface)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.75rem",
                      }}
                    >
                      <div
                        style={{
                          width: "60px",
                          height: "60px",
                          borderRadius: "50%",
                          backgroundColor:
                            token.status === "completed"
                              ? "var(--text-muted)"
                              : "var(--primary)",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "900",
                          fontSize: "1.75rem",
                        }}
                      >
                        {token.token_number}
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: "1.5rem",
                            color: "var(--text-main)",
                          }}
                        >
                          {token.patients?.name}
                        </div>
                        <div
                          style={{
                            fontSize: "1rem",
                            color: "var(--text-muted)",
                            display: "flex",
                            gap: "1.5rem",
                            marginTop: "0.5rem",
                            fontWeight: 700,
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                            }}
                          >
                            <Phone size={14} /> {token.patients?.phone}
                          </span>
                          {token.appointment_time && (
                            <span
                              style={{
                                color: "var(--secondary)",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                              }}
                            >
                              <Clock size={16} />{" "}
                              {token.appointment_time.slice(0, 5)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "1rem" }}>
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
        <div style={{ flex: "1 1 400px" }}>
          <div
            className="card glass-panel shadow-2xl"
            style={{
              padding: "2.5rem",
              position: "sticky",
              top: "2.5rem",
              border: "1px solid var(--primary-light)",
              borderRadius: "2.5rem",
            }}
          >
            <h2
              style={{
                fontSize: "2rem",
                fontWeight: 950,
                marginBottom: "2rem",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <UserPlus size={32} /> {t("addToken", pref)}
            </h2>

            {/* BOOKING TYPE - FIRST STEP */}
            <div className="form-group" style={{ marginBottom: "2.5rem" }}>
              <label
                className="form-label"
                style={{
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                  marginBottom: "1rem",
                }}
              >
                1. {t("bookingType", pref).toUpperCase()}
              </label>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setBookingType("walk_in")}
                  style={{
                    flex: 1,
                    padding: "1.5rem",
                    borderRadius: "1.25rem",
                    border: `3px solid ${bookingType === "walk_in" ? "var(--secondary)" : "var(--border)"}`,
                    backgroundColor:
                      bookingType === "walk_in"
                        ? "rgba(16, 185, 129, 0.05)"
                        : "var(--surface)",
                    color: "var(--text-main)",
                    fontWeight: 800,
                    fontSize: "1.1rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                  }}
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
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {t("patientIsPresent", pref)}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setBookingType("phone")}
                  style={{
                    flex: 1,
                    padding: "1.5rem",
                    borderRadius: "1.25rem",
                    border: `3px solid ${bookingType === "phone" ? "var(--secondary)" : "var(--border)"}`,
                    backgroundColor:
                      bookingType === "phone"
                        ? "rgba(16, 185, 129, 0.05)"
                        : "var(--surface)",
                    color: "var(--text-main)",
                    fontWeight: 800,
                    fontSize: "1.1rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                  }}
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
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {t("futureAppointment", pref)}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* SEARCH PATIENT */}
            <div className="form-group" style={{ marginBottom: "2.5rem" }}>
              <label
                className="form-label"
                style={{
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                }}
              >
                2. {t("searchNamePhone", pref).toUpperCase()}
              </label>
              <div style={{ position: "relative" }}>
                <Search
                  size={24}
                  style={{
                    position: "absolute",
                    left: "1.5rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--primary)",
                  }}
                />
                <input
                  type="text"
                  className="form-input shadow-inner"
                  style={{
                    paddingLeft: "4rem",
                    height: "4.5rem",
                    fontSize: "1.35rem",
                    fontWeight: 800,
                    borderRadius: "1.5rem",
                    color: "var(--text-main)",
                    backgroundColor: "var(--surface)",
                  }}
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
                    style={{
                      position: "absolute",
                      right: "1.5rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                    }}
                  >
                    <X size={28} />
                  </button>
                )}
              </div>
            </div>

            {/* SEARCH RESULTS */}
            {searchTerm.length >= 3 && (
              <div
                className="animate-fade-in"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  marginBottom: "2.5rem",
                }}
              >
                <label
                  className="form-label"
                  style={{
                    fontWeight: 800,
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
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
                    style={{
                      width: "100%",
                      padding: "1.5rem",
                      borderRadius: "1.5rem",
                      border: `3px solid ${selectedPatient?.id === p.id ? "var(--primary)" : "var(--border)"}`,
                      backgroundColor:
                        selectedPatient?.id === p.id
                          ? "rgba(79, 70, 229, 0.05)"
                          : "var(--background)",
                      color: "var(--text-main)",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "1.5rem",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor:
                          selectedPatient?.id === p.id
                            ? "var(--primary)"
                            : "var(--surface)",
                        color:
                          selectedPatient?.id === p.id
                            ? "white"
                            : "var(--primary)",
                        padding: "1rem",
                        borderRadius: "1.25rem",
                      }}
                    >
                      <User size={24} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: "1.35rem",
                          color: "var(--text-main)",
                        }}
                      >
                        {p.name}
                      </div>
                      <div
                        style={{
                          fontSize: "1rem",
                          color: "var(--text-muted)",
                          fontWeight: 700,
                        }}
                      >
                        {p.phone}
                      </div>
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
                  style={{
                    width: "100%",
                    padding: "1.5rem",
                    borderRadius: "1.5rem",
                    border: `3px dashed ${isNewPatient ? "var(--primary)" : "var(--text-muted)"}`,
                    backgroundColor: isNewPatient
                      ? "rgba(79, 70, 229, 0.05)"
                      : "transparent",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "1.5rem",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: isNewPatient
                        ? "var(--primary)"
                        : "var(--surface)",
                      color: isNewPatient ? "white" : "var(--text-muted)",
                      padding: "1rem",
                      borderRadius: "1.25rem",
                    }}
                  >
                    <Plus size={28} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 900,
                        color: isNewPatient
                          ? "var(--primary)"
                          : "var(--text-muted)",
                        fontSize: "1.2rem",
                      }}
                    >
                      {t("addNewProfile", pref)}
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      ({t("optional", pref)})
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* CREATION FORM FOR NEW PATIENT */}
            {isNewPatient && (
              <div
                className="animate-fade-in"
                style={{
                  padding: "2rem",
                  backgroundColor: "var(--background)",
                  borderRadius: "2rem",
                  marginBottom: "2.5rem",
                  border: "2px solid var(--border)",
                }}
              >
                <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                  <label
                    className="form-label"
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 900,
                      color: "var(--text-muted)",
                    }}
                  >
                    {t("patientName", pref).toUpperCase()}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--text-main)",
                      height: "4rem",
                      fontSize: "1.2rem",
                    }}
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
                  <label
                    className="form-label"
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 900,
                      color: "var(--text-muted)",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{t("phone", pref).toUpperCase()}</span>
                    {newPatientData.phone && !phoneValidForNew && (
                      <span
                        style={{ color: "var(--danger)", fontSize: "0.65rem" }}
                      >
                        {t("enterTenDigits", pref)}
                      </span>
                    )}
                    {phoneValidForNew && (
                      <span
                        style={{
                          color: "var(--secondary)",
                          fontSize: "0.65rem",
                        }}
                      >
                        {t("validNumber", pref)}
                      </span>
                    )}
                  </label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: "1.25rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontWeight: 900,
                        color: "var(--primary)",
                        opacity: 0.8,
                      }}
                    >
                      +91
                    </span>
                    <input
                      type="tel"
                      className="form-input"
                      style={{
                        backgroundColor: "var(--surface)",
                        color: "var(--text-main)",
                        height: "4rem",
                        fontSize: "1.25rem",
                        paddingLeft: "4rem",
                        border:
                          newPatientData.phone && !phoneValidForNew
                            ? "2px solid var(--danger)"
                            : "1px solid var(--border)",
                      }}
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
              <div
                className="animate-fade-in"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2.5rem",
                }}
              >
                <div className="form-group">
                  <label
                    className="form-label"
                    style={{
                      fontWeight: 800,
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      letterSpacing: "0.1em",
                      marginBottom: "1rem",
                    }}
                  >
                    3. {t("appointmentDate", pref).toUpperCase()}
                  </label>
                  <div style={{ position: "relative" }}>
                    <Calendar
                      size={18}
                      style={{
                        position: "absolute",
                        left: "1.25rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        opacity: 0.5,
                      }}
                    />
                    <input
                      type="date"
                      className="form-input"
                      style={{
                        paddingLeft: "3.5rem",
                        height: "4rem",
                        fontSize: "1.125rem",
                        color: "var(--text-main)",
                        backgroundColor: "var(--surface)",
                        borderRadius: "1.25rem",
                        fontWeight: 800,
                      }}
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
                  <label
                    className="form-label"
                    style={{
                      fontWeight: 800,
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    4. {t("selectDoctor", pref).toUpperCase()}
                  </label>
                  <select
                    className="form-select shadow-sm"
                    style={{
                      height: "4.5rem",
                      marginBottom: "1.5rem",
                      borderRadius: "1.5rem",
                      border: "3px solid var(--primary)",
                      fontSize: "1.25rem",
                      fontWeight: 900,
                      color: "var(--text-main)",
                      backgroundColor: "var(--surface)",
                    }}
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

                {bookingSchedule && (
                  <div className="form-group">
                    <label
                      className="form-label"
                      style={{
                        fontWeight: 800,
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      5. {t("availableSlots", pref).toUpperCase()}
                    </label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "0.875rem",
                        maxHeight: "200px",
                        overflowY: "auto",
                        padding: "0.5rem",
                      }}
                    >
                      {generateSlots(bookingSchedule).map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={slot.booked}
                          onClick={() => setAppointmentTime(slot.time)}
                          style={{
                            padding: "1rem 0",
                            fontSize: "0.9rem",
                            borderRadius: "1.25rem",
                            border: "1px solid var(--border)",
                            backgroundColor: slot.booked
                              ? "var(--background)"
                              : appointmentTime === slot.time
                                ? "var(--primary)"
                                : "var(--surface)",
                            color: slot.booked
                              ? "var(--text-muted)"
                              : appointmentTime === slot.time
                                ? "white"
                                : "var(--text-main)",
                            cursor: slot.booked ? "not-allowed" : "pointer",
                            fontWeight: 900,
                          }}
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
                <label
                  className="form-label"
                  style={{
                    fontWeight: 800,
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
                  3. {t("selectDoctor", pref).toUpperCase()}
                </label>
                <select
                  className="form-select shadow-sm"
                  style={{
                    height: "4.5rem",
                    marginBottom: "1.5rem",
                    borderRadius: "1.5rem",
                    border: "3px solid var(--primary)",
                    fontSize: "1.25rem",
                    fontWeight: 900,
                    color: "var(--text-main)",
                    backgroundColor: "var(--surface)",
                  }}
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
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  {t("walkInForTodayOnly", pref)}
                </p>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            {(selectedPatient || isNewPatient) && bookingScheduleId && (
              <button
                type="submit"
                onClick={handleAddToken}
                className="btn btn-primary"
                style={{
                  padding: "1.75rem",
                  width: "100%",
                  fontSize: "1.75rem",
                  fontWeight: 950,
                  borderRadius: "2rem",
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                  alignItems: "center",
                }}
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
                    {" "}
                    {t("generateToken", pref).toUpperCase()}{" "}
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
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="card glass-panel"
            style={{
              maxWidth: "500px",
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
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <Share2 size={28} /> {t("shareTitle", pref)}
              </h2>
              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "0.5rem",
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Token Info Summary */}
            <div
              style={{
                padding: "1.5rem",
                backgroundColor: "var(--background)",
                borderRadius: "1.5rem",
                marginBottom: "2rem",
                border: "2px solid var(--primary)",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  marginBottom: "0.5rem",
                }}
              >
                {t("patientName", pref)}
              </div>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 900,
                  color: "var(--text-main)",
                  marginBottom: "0.75rem",
                }}
              >
                {selectedToken.patients?.name}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  fontSize: "0.9rem",
                  color: "var(--text-muted)",
                  fontWeight: 700,
                  marginBottom: "1rem",
                }}
              >
                <Phone size={16} color="var(--primary)" />
                {selectedToken.patients?.phone}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                <span>
                  {t("tokenNumber", pref)}: #{selectedToken.token_number}
                </span>
                <span>•</span>
                <span>{getStatusLabel(selectedToken.status, pref)}</span>
              </div>
            </div>

            {/* Message Preview */}
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
                }}
              >
                {t("shareMessage", pref) || "Message Preview"}
              </label>
              <div
                style={{
                  padding: "1.25rem",
                  backgroundColor: "var(--surface)",
                  borderRadius: "1rem",
                  border: "1px solid var(--border)",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  color: "var(--text-main)",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {getShareMessageForToken(selectedToken)}
              </div>
            </div>

            {/* Share Buttons */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <button
                onClick={handleWhatsAppShare}
                className="btn"
                style={{
                  padding: "1.25rem",
                  backgroundColor: "#25D366",
                  color: "white",
                  fontWeight: 800,
                  fontSize: "1.05rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.75rem",
                }}
              >
                <MessageCircle size={22} />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <span>{t("shareViaWhatsApp", pref)}</span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      opacity: 0.9,
                    }}
                  >
                    Opens chat with {selectedToken.patients?.name}
                  </span>
                </div>
              </button>

              <button
                onClick={handleSmsShare}
                className="btn btn-outline"
                style={{
                  padding: "1.25rem",
                  fontWeight: 800,
                  fontSize: "1.1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.75rem",
                }}
              >
                <Smartphone size={22} /> {t("shareViaSms", pref)}
              </button>

              <button
                onClick={handleCopyMessage}
                className="btn btn-outline"
                style={{
                  padding: "1.25rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.75rem",
                  position: "relative",
                }}
              >
                <Copy size={20} />{" "}
                {copied ? t("messageCopied", pref) : t("copyMessage", pref)}
                {copied && (
                  <CheckCircle2
                    size={18}
                    color="var(--secondary)"
                    style={{ position: "absolute", right: "1.5rem" }}
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
