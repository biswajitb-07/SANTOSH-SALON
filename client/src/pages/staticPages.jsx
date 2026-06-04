import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query as firestoreQuery,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import {
  Award,
  Clock3,
  Edit3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Scissors,
  Shield,
  Sparkles,
  Star,
  Trash2,
  Users,
  Zap,
  X
} from "lucide-react";
import { ButtonSpinner } from "../components/common.jsx";
import { db } from "../lib/firebase.js";
import { getSafeErrorMessage } from "../lib/errors.js";

/* ─────────────────────────────────────────
   SHARED STYLES
───────────────────────────────────────── */
const glassCard = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.02) 100%), rgba(12,20,18,0.82)",
  border: "1px solid rgba(246,199,106,0.14)",
  backdropFilter: "blur(28px) saturate(135%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 20px 60px rgba(0,0,0,0.38)"
};

const redGlass = {
  background: "linear-gradient(145deg, rgba(120,20,28,0.28), rgba(12,20,18,0.8))",
  border: "1px solid rgba(246,199,106,0.16)",
  backdropFilter: "blur(24px)"
};

const cardBase = {
  borderRadius: "1.25rem",
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(9,16,14,0.8)"
};

/* ─────────────────────────────────────────
   ABOUT PAGE
───────────────────────────────────────── */
export function AboutPage() {
  return (
    <>
      {/* Owner portrait */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              position: "relative",
              display: "grid",
              placeItems: "center",
              height: "18rem",
              width: "18rem",
              borderRadius: "999px",
              padding: "0.75rem",
              ...glassCard,
              boxShadow: "0 32px 80px rgba(0,0,0,0.5)"
            }}
            className="sm:h-96 sm:w-96"
          >
            <div
              style={{
                position: "absolute",
                inset: "1rem",
                borderRadius: "999px",
                border: "1px solid rgba(246,199,106,0.28)",
                pointerEvents: "none"
              }}
            />
            <img
              alt="Santosh Salon owner"
              src="/assets/owner-santosh-avatar.png"
              loading="lazy"
              decoding="async"
              style={{ height: "100%", width: "100%", borderRadius: "999px", objectFit: "cover", objectPosition: "63% 34%" }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-0.5rem",
                left: "50%",
                transform: "translateX(-50%)",
                width: "86%",
                borderRadius: "999px",
                border: "1px solid rgba(246,199,106,0.22)",
                background: "rgba(3,8,6,0.92)",
                padding: "0.75rem 1rem",
                textAlign: "center",
                backdropFilter: "blur(16px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
              }}
            >
              <p style={{ fontSize: "0.65rem", fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-gold)" }}>
                Owner led service
              </p>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1rem",
                  fontWeight: 400,
                  color: "var(--color-text)"
                }}
              >
                Santosh Salon Queue
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div style={{ display: "grid", gap: "1rem" }} className="md:grid-cols-3">
          {[
            [Star, "Live Turns", "Time-slot based flow with a clear estimated turn so you never wait blindly."],
            [Scissors, "Clean Service", "Haircut, beard, wash, and facial grooming in one professional place."],
            [Clock3, "Long Hours", "Open daily from 7 AM to 11 PM for convenient visits any time of day."]
          ].map(([Icon, title, text]) => (
            <article
              key={title}
              style={{ borderRadius: "1.75rem", padding: "1.5rem", ...glassCard }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  height: "3rem",
                  width: "3rem",
                  borderRadius: "0.875rem",
                  background: "rgba(246,199,106,0.1)",
                  border: "1px solid rgba(246,199,106,0.2)"
                }}
              >
                <Icon size={20} color="var(--color-gold)" />
              </span>
              <h3
                style={{
                  marginTop: "1.1rem",
                  fontFamily: "var(--font-display)",
                  fontSize: "1.35rem",
                  fontWeight: 400,
                  color: "var(--color-text)"
                }}
              >
                {title}
              </h3>
              <p style={{ marginTop: "0.5rem", lineHeight: 1.75, color: "var(--color-muted)", fontSize: "0.875rem" }}>
                {text}
              </p>
            </article>
          ))}
        </div>

        {/* Extra about content */}
        <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }} className="sm:grid-cols-2">
          {[
            [Award, "15+ Years Experience", "Santosh brings over 15 years of barbering mastery to every customer, combining traditional techniques with modern styles."],
            [Users, "3-Chair Capacity", "With three fully equipped barber chairs, we serve customers efficiently while maintaining the highest quality standards."],
            [Shield, "Hygiene First", "Every tool is sanitized between customers. We follow strict cleanliness protocols for your safety and comfort."],
            [Zap, "Tech-Powered Queue", "Our live queue system eliminates waiting room anxiety — you know exactly when to arrive for your turn."]
          ].map(([Icon, title, text]) => (
            <article
              key={title}
              style={{ borderRadius: "1.25rem", padding: "1.25rem", ...cardBase }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <Icon size={18} color="var(--color-gold)" />
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 800, color: "var(--color-text)" }}>{title}</h3>
              </div>
              <p style={{ fontSize: "0.85rem", lineHeight: 1.7, color: "var(--color-muted)" }}>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────
   CONTACT PAGE
───────────────────────────────────────── */
const unresolvedIssueStatuses = ["open", "pending", "in_progress"];

const getIssueMillis = (value) => {
  if (!value) return 0;
  if (value.toMillis) return value.toMillis();
  if (value.toDate) return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const normalizeIssue = (snapshotDoc) => {
  const data = snapshotDoc.data();
  const updatedMillis = getIssueMillis(data.updatedAt);
  const createdMillis = getIssueMillis(data.createdAt);
  return {
    id: snapshotDoc.id,
    name: data.name || "",
    mobile: data.mobile || "",
    email: data.email || "",
    message: data.message || "",
    status: String(data.status || "open").toLowerCase(),
    sortTime: updatedMillis || createdMillis,
    displayTime: (updatedMillis || createdMillis)
      ? new Date(updatedMillis || createdMillis).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
      : "Just now"
  };
};

export function ContactPage({ user }) {
  const [submitting, setSubmitting] = useState(false);
  const [issueHistory, setIssueHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState("");
  const [deletingIssueId, setDeletingIssueId] = useState("");
  const [form, setForm] = useState({
    name: user?.displayName || "",
    mobile: "",
    email: user?.email || "",
    message: ""
  });

  const updateField = (field, value) => setForm((c) => ({ ...c, [field]: value }));

  const loadIssueHistory = async (mobileValue = form.mobile) => {
    const mobile = String(mobileValue || "").replace(/\D/g, "");
    const issueQueries = [];
    if (user?.uid) {
      issueQueries.push(firestoreQuery(collection(db, "contactIssues"), where("userId", "==", user.uid), limit(20)));
    }
    if (mobile.length >= 10) {
      issueQueries.push(firestoreQuery(collection(db, "contactIssues"), where("mobile", "==", mobile), limit(20)));
    }
    if (!issueQueries.length) { setIssueHistory([]); return []; }
    setHistoryLoading(true);
    try {
      const snapshots = await Promise.all(issueQueries.map((q) => getDocs(q)));
      const issueMap = new Map();
      snapshots.forEach((snap) => snap.docs.forEach((d) => issueMap.set(d.id, normalizeIssue(d))));
      const issues = [...issueMap.values()].sort((a, b) => b.sortTime - a.sortTime).slice(0, 3);
      setIssueHistory(issues);
      return issues;
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Issue history could not be loaded."));
      return [];
    } finally {
      setHistoryLoading(false);
    }
  };

  const cleanupIssueHistory = async (mobileValue) => {
    const mobile = String(mobileValue || "").replace(/\D/g, "");
    const issueQueries = [];
    if (user?.uid) issueQueries.push(firestoreQuery(collection(db, "contactIssues"), where("userId", "==", user.uid), limit(30)));
    if (mobile.length >= 10) issueQueries.push(firestoreQuery(collection(db, "contactIssues"), where("mobile", "==", mobile), limit(30)));
    const snapshots = await Promise.all(issueQueries.map((q) => getDocs(q)));
    const issueMap = new Map();
    snapshots.forEach((snap) => snap.docs.forEach((d) => issueMap.set(d.id, normalizeIssue(d))));
    const oldIssues = [...issueMap.values()].sort((a, b) => b.sortTime - a.sortTime).slice(3);
    await Promise.all(oldIssues.map((issue) => deleteDoc(doc(db, "contactIssues", issue.id))));
  };

  useEffect(() => {
    setForm((c) => ({ ...c, name: c.name || user?.displayName || "", email: c.email || user?.email || "" }));
  }, [user]);

  useEffect(() => {
    if (user?.uid) loadIssueHistory();
  }, [user?.uid]);

  const submitContact = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const mobile = form.mobile.replace(/\D/g, "");
    const email = form.email.trim().toLowerCase();
    const message = form.message.trim();
    if (!name || mobile.length < 10 || !message) {
      toast.error("Please enter name, valid mobile number, and message.");
      return;
    }
    setSubmitting(true);
    try {
      const issues = await loadIssueHistory(mobile);
      const hasOpenIssue = issues.some((i) => unresolvedIssueStatuses.includes(i.status));
      if (hasOpenIssue && !editingIssueId) {
        toast.warning("Your previous issue is still open. You can send a new message after it is resolved.");
        return;
      }
      if (editingIssueId) {
        await updateDoc(doc(db, "contactIssues", editingIssueId), { name, mobile, email: email || user?.email || "", message, editedAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast.success("Message updated.");
      } else {
        await addDoc(collection(db, "contactIssues"), { userId: user?.uid || "", name, mobile, email: email || user?.email || "", message, status: "open", source: "client-contact-page", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast.success("Message sent. The salon team will review your issue.");
      }
      await cleanupIssueHistory(mobile);
      await loadIssueHistory(mobile);
      setEditingIssueId("");
      setForm((c) => ({ ...c, message: "" }));
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Message could not be sent."));
    } finally {
      setSubmitting(false);
    }
  };

  const editIssue = (issue) => {
    setEditingIssueId(issue.id);
    setForm({ name: issue.name || form.name, mobile: issue.mobile || form.mobile, email: issue.email || form.email, message: issue.message || "" });
  };

  const cancelEdit = () => {
    setEditingIssueId("");
    setForm((c) => ({ ...c, message: "" }));
  };

  const deleteIssue = async (issueId) => {
    setDeletingIssueId(issueId);
    try {
      await deleteDoc(doc(db, "contactIssues", issueId));
      if (editingIssueId === issueId) cancelEdit();
      toast.success("Message deleted. You can send a new issue now.");
      await loadIssueHistory();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Message could not be deleted."));
    } finally {
      setDeletingIssueId("");
    }
  };

  const inputStyle = {
    display: "block",
    width: "100%",
    minHeight: "50px",
    padding: "0 1rem",
    borderRadius: "0.875rem",
    border: "1.5px solid var(--color-border)",
    background: "rgba(5,10,9,0.85)",
    color: "var(--color-text)",
    fontSize: "0.9375rem",
    outline: "none",
    transition: "border-color 0.15s"
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div style={{ display: "grid", gap: "1.25rem" }} className="lg:grid-cols-[0.9fr_1.1fr]">
        {/* Info sidebar */}
        <aside
          style={{
            borderRadius: "1.75rem",
            padding: "1.75rem",
            color: "white",
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            ...redGlass
          }}
          className="sm:p-8"
        >
          <p className="section-kicker">Contact Us</p>
          <h1
            style={{
              marginTop: "0.5rem",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem,4vw,3rem)",
              fontWeight: 400,
              lineHeight: 1.1
            }}
          >
            Visit or message the salon.
          </h1>
          <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              [MapPin, "Main Market Road, Near City Chowk"],
              [Phone, "+91 98765 43210"],
              [Mail, "hello@santoshsalon.local"],
              [Clock3, "Open daily, 7 AM – 11 PM"]
            ].map(([Icon, label]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  borderRadius: "0.875rem",
                  background: "rgba(255,255,255,0.08)",
                  padding: "1rem"
                }}
              >
                <Icon size={18} color="var(--color-gold)" />
                <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Map placeholder */}
          <div
            style={{
              marginTop: "1.25rem",
              borderRadius: "1rem",
              height: "10rem",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "grid",
              placeItems: "center",
              color: "rgba(255,255,255,0.4)",
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase"
            }}
          >
            <div style={{ textAlign: "center" }}>
              <MapPin size={28} color="var(--color-gold)" style={{ margin: "0 auto 0.5rem" }} />
              <span>Map coming soon</span>
            </div>
          </div>
        </aside>

        {/* Form */}
        <form
          onSubmit={submitContact}
          style={{
            borderRadius: "1.75rem",
            padding: "1.75rem",
            boxShadow: "0 20px 60px rgba(0,0,0,0.38)",
            ...glassCard
          }}
          className="sm:p-8"
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2rem",
              fontWeight: 400,
              color: "var(--color-text)"
            }}
          >
            Send a message
          </h2>
          <div style={{ marginTop: "1.25rem", display: "grid", gap: "1rem" }} className="sm:grid-cols-2">
            {[
              { label: "Full Name", field: "name", placeholder: "Your name" },
              { label: "Mobile Number", field: "mobile", placeholder: "98765 43210" }
            ].map(({ label, field, placeholder }) => (
              <label key={field} style={{ display: "block" }}>
                <span style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-muted)" }}>
                  {label}
                </span>
                <input
                  style={inputStyle}
                  placeholder={placeholder}
                  value={form[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                />
              </label>
            ))}
          </div>

          <label style={{ display: "block", marginTop: "1rem" }}>
            <span style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-muted)" }}>
              Email
            </span>
            <input
              style={inputStyle}
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
          </label>

          <label style={{ display: "block", marginTop: "1rem" }}>
            <span style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-muted)" }}>
              Message
            </span>
            <textarea
              style={{ ...inputStyle, minHeight: "140px", padding: "0.875rem 1rem", resize: "vertical" }}
              placeholder="Write your message..."
              value={form.message}
              onChange={(e) => updateField("message", e.target.value)}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              minHeight: "52px",
              width: "100%",
              borderRadius: "999px",
              border: "none",
              background: "linear-gradient(135deg, #a31621, #7f1317)",
              color: "white",
              fontWeight: 800,
              fontSize: "0.9375rem",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
              boxShadow: "0 8px 24px rgba(163,22,33,0.3)"
            }}
          >
            {submitting ? <ButtonSpinner /> : <MessageCircle size={18} />}
            {submitting ? "Sending..." : editingIssueId ? "Update Message" : "Send Message"}
          </button>

          {editingIssueId ? (
            <button
              type="button"
              onClick={cancelEdit}
              style={{
                marginTop: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                minHeight: "46px",
                width: "100%",
                borderRadius: "999px",
                border: "1px solid var(--color-border)",
                background: "var(--color-elevated)",
                color: "var(--color-text)",
                fontWeight: 800,
                fontSize: "0.875rem",
                cursor: "pointer"
              }}
            >
              <X size={16} />
              Cancel Edit
            </button>
          ) : null}

          <p
            style={{
              marginTop: "0.875rem",
              borderRadius: "0.875rem",
              background: "rgba(163,22,33,0.12)",
              border: "1px solid rgba(163,22,33,0.25)",
              padding: "0.75rem 1rem",
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#fca5a5",
              lineHeight: 1.6
            }}
          >
            You can keep only one unresolved issue open at a time. A new message is allowed after the salon marks your previous issue as resolved.
          </p>

          {/* Issue history */}
          <div
            style={{
              marginTop: "1.25rem",
              borderRadius: "1.25rem",
              border: "1px solid var(--color-border)",
              background: "rgba(5,10,9,0.75)",
              padding: "1rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--color-text)" }}>Recent messages</h3>
              <button
                type="button"
                onClick={() => loadIssueHistory()}
                style={{
                  borderRadius: "999px",
                  border: "1px solid var(--color-border)",
                  background: "transparent",
                  padding: "0.25rem 0.75rem",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  color: "var(--color-gold)",
                  cursor: "pointer"
                }}
              >
                Refresh
              </button>
            </div>
            {historyLoading ? (
              <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", fontWeight: 600, color: "var(--color-muted)" }}>Loading...</p>
            ) : issueHistory.length ? (
              <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {issueHistory.map((issue) => (
                  <article
                    key={issue.id}
                    style={{
                      borderRadius: "1rem",
                      border: "1px solid var(--color-border)",
                      background: "rgba(12,20,18,0.7)",
                      padding: "1rem"
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "0.625rem" }}>
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            borderRadius: "999px",
                            background: "rgba(163,22,33,0.15)",
                            border: "1px solid rgba(163,22,33,0.25)",
                            padding: "0.2rem 0.6rem",
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "#fca5a5"
                          }}
                        >
                          {issue.status.replace(/_/g, " ")}
                        </span>
                        <p style={{ marginTop: "0.35rem", fontSize: "0.72rem", fontWeight: 600, color: "var(--color-muted)" }}>
                          {issue.displayTime}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => editIssue(issue)}
                          style={{
                            display: "grid",
                            placeItems: "center",
                            height: "2.25rem",
                            width: "2.25rem",
                            borderRadius: "0.625rem",
                            border: "1px solid rgba(246,199,106,0.2)",
                            background: "rgba(246,199,106,0.08)",
                            color: "var(--color-gold)",
                            cursor: "pointer"
                          }}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          disabled={deletingIssueId === issue.id}
                          onClick={() => deleteIssue(issue.id)}
                          style={{
                            display: "grid",
                            placeItems: "center",
                            height: "2.25rem",
                            width: "2.25rem",
                            borderRadius: "0.625rem",
                            border: "1px solid rgba(163,22,33,0.25)",
                            background: "rgba(163,22,33,0.12)",
                            color: "#fca5a5",
                            cursor: deletingIssueId === issue.id ? "not-allowed" : "pointer",
                            opacity: deletingIssueId === issue.id ? 0.5 : 1
                          }}
                        >
                          {deletingIssueId === issue.id ? <ButtonSpinner /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </div>
                    <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.65, color: "var(--color-text)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {issue.message}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", fontWeight: 600, color: "var(--color-muted)" }}>
                No recent messages found.
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   PRICING PAGE
───────────────────────────────────────── */
export function PricingPage() {
  const plans = [
    { title: "Classic Haircut", price: "Rs. 120", duration: "25 min", text: "Slot booking with live queue status. Precision cut by experienced barber.", popular: true },
    { title: "Beard Styling", price: "Rs. 80", duration: "15 min", text: "Quick grooming slot with clear turn tracking. Sharp edges guaranteed.", popular: false },
    { title: "Hair Wash", price: "Rs. 70", duration: "12 min", text: "Fresh wash service with time slot booking. Premium shampoo included.", popular: false },
    { title: "Facial Grooming", price: "Rs. 250", duration: "35 min", text: "Premium grooming service with online payment option. Full face care.", popular: false }
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div
        style={{
          borderRadius: "1.75rem",
          padding: "2rem 1.75rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          ...redGlass
        }}
        className="sm:p-10"
      >
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <p className="section-kicker">Pricing</p>
          <h1
            style={{
              marginTop: "0.5rem",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem,5vw,3.5rem)",
              fontWeight: 400,
              lineHeight: 1.1,
              color: "var(--color-text)"
            }}
          >
            Transparent grooming prices.
          </h1>
          <p style={{ marginTop: "0.75rem", maxWidth: "560px", margin: "0.75rem auto 0", lineHeight: 1.75, color: "rgba(255,255,255,0.65)", fontSize: "0.9rem" }}>
            Every customer booking is confirmed only after Cashfree online payment. The final payable amount, including Cashfree charge, is shown at checkout.
          </p>
        </div>

        <div style={{ display: "grid", gap: "1rem" }} className="md:grid-cols-2">
          {plans.map(({ title, price, duration, text, popular }) => (
            <article
              key={title}
              style={{
                borderRadius: "1.25rem",
                border: popular ? "1px solid rgba(246,199,106,0.4)" : "1px solid rgba(255,255,255,0.06)",
                background: popular ? "rgba(246,199,106,0.06)" : "rgba(9,16,14,0.8)",
                padding: "1.5rem",
                position: "relative",
                transition: "border-color 0.2s, transform 0.2s"
              }}
            >
              {popular && (
                <span
                  style={{
                    position: "absolute",
                    top: "-0.6rem",
                    right: "1.25rem",
                    borderRadius: "999px",
                    background: "var(--color-gold)",
                    color: "#0b0c08",
                    padding: "0.2rem 0.75rem",
                    fontSize: "0.65rem",
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase"
                  }}
                >
                  Most Popular
                </span>
              )}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                <div>
                  <p style={{ fontSize: "0.68rem", fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-gold)" }}>
                    {title}
                  </p>
                  <p
                    style={{
                      marginTop: "0.75rem",
                      fontFamily: "var(--font-display)",
                      fontSize: "2.25rem",
                      fontWeight: 400,
                      color: "var(--color-text)",
                      lineHeight: 1
                    }}
                  >
                    {price}
                  </p>
                </div>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    borderRadius: "999px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.07)",
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "var(--color-muted)",
                    whiteSpace: "nowrap"
                  }}
                >
                  <Clock3 size={12} />
                  {duration}
                </span>
              </div>
              <p style={{ marginTop: "0.875rem", fontSize: "0.875rem", lineHeight: 1.65, color: "var(--color-muted)" }}>
                {text}
              </p>
            </article>
          ))}
        </div>

        {/* Payment note */}
        <div
          style={{
            marginTop: "1.5rem",
            borderRadius: "1rem",
            border: "1px solid rgba(246,199,106,0.2)",
            background: "rgba(246,199,106,0.06)",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.875rem"
          }}
        >
          <Sparkles size={18} color="var(--color-gold)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(246,199,106,0.85)", lineHeight: 1.6 }}>
            All prices shown are base rates. The Cashfree payment gateway charge will be displayed separately before you confirm your booking.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   GALLERY PAGE
───────────────────────────────────────── */
export function GalleryPage() {
  const gallery = [
    ["/assets/salon-hero.png", "Santosh Salon interior"],
    ["/assets/haircut-feature.png", "Haircut station"],
    ["/assets/haircut-styles.png", "Haircut style wall"],
    ["/assets/owner-santosh-portrait.png", "Owner portrait"]
  ];
  const beforeAfter = [
    ["Classic cleanup", "/assets/haircut-feature.png", "/assets/haircut-styles.png"],
    ["Beard shape finish", "/assets/owner-santosh-portrait.png", "/assets/salon-hero.png"]
  ];
  const reviews = [
    ["Amit Kumar", "Live token helped me reach exactly near my turn."],
    ["Rahul Singh", "Clean haircut, easy payment, and clear refund policy."],
    ["Vikas Sharma", "The booking flow is simple on mobile."]
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div
        style={{
          borderRadius: "1.75rem",
          padding: "2rem 1.75rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.38)",
          ...glassCard
        }}
        className="sm:p-10"
      >
        <p className="section-kicker">Gallery</p>
        <h1
          style={{
            marginTop: "0.5rem",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem,5vw,3.5rem)",
            fontWeight: 400,
            lineHeight: 1.1
          }}
        >
          Salon visuals before you visit.
        </h1>

        {/* Main gallery grid */}
        <div style={{ marginTop: "2rem", display: "grid", gap: "1rem" }} className="sm:grid-cols-2">
          {gallery.map(([src, alt]) => (
            <figure
              key={src}
              style={{
                overflow: "hidden",
                borderRadius: "1.25rem",
                border: "1px solid var(--color-border)",
                background: "var(--color-elevated)"
              }}
            >
              <img
                alt={alt}
                src={src}
                loading="lazy"
                decoding="async"
                style={{ height: "16rem", width: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s ease" }}
              />
              <figcaption style={{ padding: "0.875rem 1rem", fontWeight: 800, color: "var(--color-text)", fontSize: "0.875rem" }}>
                {alt}
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Before / After */}
        <div style={{ marginTop: "2.5rem" }}>
          <p className="section-kicker">Before / After</p>
          <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }} className="md:grid-cols-2">
            {beforeAfter.map(([title, before, after]) => (
              <article
                key={title}
                style={{ borderRadius: "1.25rem", border: "1px solid var(--color-border)", background: "rgba(9,16,14,0.8)", padding: "1.25rem" }}
              >
                <h2
                  style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 400, color: "var(--color-text)", marginBottom: "1rem" }}
                >
                  {title}
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  {[["Before", before, "#b5b0a7"], ["After", after, "var(--color-gold)"]].map(([label, imgSrc, color]) => (
                    <figure key={label}>
                      <img
                        alt={`${title} ${label}`}
                        src={imgSrc}
                        loading="lazy"
                        decoding="async"
                        style={{ height: "11rem", width: "100%", objectFit: "cover", borderRadius: "0.875rem", display: "block" }}
                      />
                      <figcaption style={{ marginTop: "0.5rem", fontSize: "0.65rem", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color }}>{label}</figcaption>
                    </figure>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Offers + Reviews */}
        <div style={{ marginTop: "2.5rem", display: "grid", gap: "1rem" }} className="lg:grid-cols-[0.8fr_1.2fr]">
          <aside
            style={{
              borderRadius: "1.25rem",
              border: "1px solid rgba(246,199,106,0.22)",
              background: "rgba(246,199,106,0.06)",
              padding: "1.25rem"
            }}
          >
            <p className="section-kicker">Offers</p>
            <h2
              style={{
                marginTop: "0.5rem",
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 400,
                color: "var(--color-gold)"
              }}
            >
              Use WELCOME10 at checkout.
            </h2>
            <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "rgba(246,199,106,0.75)", lineHeight: 1.65 }}>
              New customers can apply the coupon in the booking modal.
            </p>
          </aside>
          <div style={{ display: "grid", gap: "0.75rem" }} className="sm:grid-cols-3">
            {reviews.map(([name, text]) => (
              <article
                key={name}
                style={{
                  borderRadius: "1.25rem",
                  border: "1px solid var(--color-border)",
                  background: "rgba(9,16,14,0.8)",
                  padding: "1.25rem"
                }}
              >
                <div style={{ display: "flex", gap: "0.2rem", marginBottom: "0.5rem" }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} color="var(--color-gold)" fill="var(--color-gold)" />
                  ))}
                </div>
                <p style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.4rem" }}>{name}</p>
                <p style={{ fontSize: "0.8rem", lineHeight: 1.65, color: "var(--color-muted)" }}>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   STAFF PAGE
───────────────────────────────────────── */
export function StaffPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div
        style={{ borderRadius: "1.75rem", padding: "2rem 1.75rem", boxShadow: "0 20px 60px rgba(0,0,0,0.38)", ...glassCard }}
        className="sm:p-10"
      >
        <p className="section-kicker">Staff</p>
        <h1
          style={{
            marginTop: "0.5rem",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem,5vw,3.5rem)",
            fontWeight: 400,
            lineHeight: 1.1
          }}
        >
          Three-chair service capacity.
        </h1>
        <p style={{ marginTop: "0.75rem", maxWidth: "560px", lineHeight: 1.75, color: "var(--color-muted)", fontSize: "0.9rem" }}>
          Santosh Salon uses staff capacity to calculate live slot availability, waiting list movement, and estimated queue time.
        </p>
        <div style={{ marginTop: "2rem", display: "grid", gap: "1rem" }} className="md:grid-cols-3">
          {[
            ["Haircut Specialist", "Mastery in classic cuts, modern fades, and textured styles.", "01"],
            ["Beard Stylist", "Expert in beard shaping, trimming, hot towel finish, and grooming.", "02"],
            ["Grooming Assistant", "Hair wash, face cleanup, and customer-care services.", "03"]
          ].map(([role, desc, num]) => (
            <article
              key={role}
              style={{ borderRadius: "1.25rem", border: "1px solid var(--color-border)", background: "rgba(9,16,14,0.8)", padding: "1.5rem" }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  height: "3rem",
                  width: "3rem",
                  borderRadius: "0.875rem",
                  background: "rgba(163,22,33,0.15)",
                  border: "1px solid rgba(163,22,33,0.25)",
                  fontFamily: "monospace",
                  fontSize: "1.1rem",
                  fontWeight: 900,
                  color: "var(--color-gold)"
                }}
              >
                {num}
              </span>
              <h2
                style={{
                  marginTop: "1.1rem",
                  fontFamily: "var(--font-display)",
                  fontSize: "1.25rem",
                  fontWeight: 400,
                  color: "var(--color-text)"
                }}
              >
                {role}
              </h2>
              <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", lineHeight: 1.7, color: "var(--color-muted)" }}>{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   SERVICE SEO PAGE
───────────────────────────────────────── */
export function ServiceSeoPage({ page }) {
  const services = {
    "haircut-service": { title: "Haircut service in Santosh Salon", image: "/assets/haircut-feature.png", price: "From Rs. 120", text: "Classic, modern, and clean haircut services with live token booking and estimated wait time." },
    "beard-styling-service": { title: "Beard styling and trimming", image: "/assets/owner-santosh-portrait.png", price: "From Rs. 80", text: "Sharp beard shaping, trimming, and finishing with easy queue booking." },
    "facial-grooming-service": { title: "Facial grooming service", image: "/assets/salon-hero.png", price: "From Rs. 250", text: "Premium grooming care for a clean, fresh salon finish." },
    "hair-wash-service": { title: "Hair wash service", image: "/assets/haircut-styles.png", price: "From Rs. 70", text: "Fresh hair wash service with simple time-slot booking." }
  };
  const content = services[page] || services["haircut-service"];

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div style={{ display: "grid", gap: "1.25rem", alignItems: "center" }} className="lg:grid-cols-[1.1fr_0.9fr]">
        <div
          style={{ borderRadius: "1.75rem", padding: "2rem 1.75rem", boxShadow: "0 20px 60px rgba(0,0,0,0.38)", ...glassCard }}
          className="sm:p-8"
        >
          <p className="section-kicker">Salon Service</p>
          <h1
            style={{
              marginTop: "0.5rem",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem,4vw,3rem)",
              fontWeight: 400,
              lineHeight: 1.1
            }}
          >
            {content.title}
          </h1>
          <p style={{ marginTop: "1rem", maxWidth: "500px", fontSize: "1rem", lineHeight: 1.75, color: "var(--color-muted)" }}>
            {content.text}
          </p>
          <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.625rem" }}>
            {[["Price", content.price], ["Booking", "Live token"], ["Refund", "Policy at checkout"]].map(([label, value]) => (
              <div key={label} style={{ borderRadius: "0.875rem", border: "1px solid var(--color-border)", background: "rgba(5,10,9,0.75)", padding: "1rem" }}>
                <p style={{ fontSize: "0.65rem", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: "#fca5a5" }}>{label}</p>
                <p style={{ marginTop: "0.5rem", fontWeight: 800, color: "var(--color-text)", fontSize: "0.875rem" }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
        <img
          alt={content.title}
          src={content.image}
          loading="lazy"
          decoding="async"
          style={{ height: "22rem", width: "100%", objectFit: "cover", borderRadius: "1.75rem", boxShadow: "0 20px 60px rgba(0,0,0,0.42)" }}
        />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   FAQ PAGE
───────────────────────────────────────── */
export function FaqPage() {
  const [openIndex, setOpenIndex] = useState(null);
  const faqs = [
    ["Can I book without OTP?", "Yes. Login is Google-based and checkout asks for name and mobile number. No separate OTP is needed."],
    ["Can I book for another person?", "Yes. One checkout can include you and one guest. Guest name and mobile are entered at checkout."],
    ["When does waiting list start?", "After confirmed daily capacity is full, eligible online bookings can move to waiting list."],
    ["Are Cashfree charges refundable?", "No. Refunds cover eligible service amount only; Cashfree charges are non-refundable as per their policy."],
    ["What if payment fails but money is debited?", "Wait for provider or bank auto-reversal, or contact the salon with payment/order ID for manual verification."],
    ["How accurate is the live queue estimate?", "Estimates are based on average service time and active queue. They update live as customers complete service."]
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div
        style={{ borderRadius: "1.75rem", padding: "2rem 1.75rem", boxShadow: "0 20px 60px rgba(0,0,0,0.38)", ...glassCard }}
        className="sm:p-10"
      >
        <p className="section-kicker">FAQ</p>
        <h1
          style={{
            marginTop: "0.5rem",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem,5vw,3.5rem)",
            fontWeight: 400,
            lineHeight: 1.1
          }}
        >
          Common booking questions.
        </h1>
        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {faqs.map(([question, answer], i) => (
            <article
              key={question}
              style={{
                borderRadius: "1.25rem",
                border: openIndex === i ? "1px solid rgba(246,199,106,0.3)" : "1px solid var(--color-border)",
                background: openIndex === i ? "rgba(246,199,106,0.04)" : "rgba(9,16,14,0.8)",
                overflow: "hidden",
                transition: "border-color 0.2s"
              }}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "1.25rem",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  gap: "1rem"
                }}
              >
                <h2 style={{ fontSize: "0.9375rem", fontWeight: 800, color: "var(--color-text)", lineHeight: 1.4 }}>
                  {question}
                </h2>
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    height: "1.75rem",
                    width: "1.75rem",
                    borderRadius: "999px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-elevated)",
                    color: "var(--color-gold)",
                    fontSize: "1rem",
                    flexShrink: 0,
                    transition: "transform 0.2s",
                    transform: openIndex === i ? "rotate(45deg)" : "none"
                  }}
                >
                  +
                </span>
              </button>
              {openIndex === i && (
                <div style={{ padding: "0 1.25rem 1.25rem" }}>
                  <p style={{ fontSize: "0.875rem", lineHeight: 1.75, color: "var(--color-muted)" }}>{answer}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   LEGAL PAGE
───────────────────────────────────────── */
const legalContent = {
  "privacy-policy": {
    eyebrow: "Privacy Policy",
    title: "How Santosh Salon handles customer data",
    updated: "30 May 2026",
    sections: [
      ["Information we collect", "We collect Google profile details after login, customer name, mobile number, selected service, booking date, time slot, estimated token number, payment status, and refund details when submitted."],
      ["How we use data", "We use this information to create estimated salon turns, show booking status, contact customers about their visit, process payments, manage refunds, and improve salon operations."],
      ["Authentication and payments", "Google Authentication is used for login. Online payments may be processed through Cashfree. Payment providers process payment details under their own security and compliance systems."],
      ["Data sharing", "We do not sell customer data. Data is shared only with service providers required to run authentication, database, hosting, payment, refund, and support workflows."],
      ["Data security", "Booking data is stored in Firebase Firestore. Access should be protected using Firebase rules, admin authentication, and server-side validation before production launch."],
      ["Contact", "For privacy requests, contact Santosh Salon at hello@santoshsalon.local or +91 98765 43210."]
    ]
  },
  "terms-and-conditions": {
    eyebrow: "Terms & Conditions",
    title: "Rules for using Santosh Salon Queue",
    updated: "30 May 2026",
    sections: [
      ["Service usage", "Customers can book salon services, choose available time slots, join queue, and view live booking status. Bookings are subject to salon working hours, staff availability, and operational decisions."],
      ["Customer responsibility", "Customers must provide correct name and mobile number. Please reach the salon around 40 minutes before your turn for smoother service."],
      ["Booking limits", "One logged-in customer can create a booking for self and one guest. New booking is restricted while an active booking is waiting, in chair, or waitlisted."],
      ["Salon operations", "The salon may skip, complete, cancel, transfer, or reschedule bookings due to closing time, staff availability, customer absence, or operational reasons."],
      ["Payments", "Customer bookings require Cashfree online payment. Booking confirmation depends on successful payment provider response."],
      ["Changes", "Santosh Salon may update these terms when service rules, pricing, payment flow, or legal requirements change."]
    ]
  },
  "cancellation-refund-policy": {
    eyebrow: "Cancellation & Refund Policy",
    title: "Booking cancellation and refund rules",
    updated: "30 May 2026",
    sections: [
      ["Customer cancellation", "Customers can cancel eligible waiting or waitlisted bookings from My Bookings. Completed haircut bookings are not eligible for refund."],
      ["Online paid bookings", "If an online paid booking is cancelled before service completion, the customer can submit a refund request with payment ID or order ID."],
      ["Refund review", "Refund requests go to the admin panel for verification. Approved refunds are generally processed within 5-7 business days."],
      ["Payment gateway charges", "Cashfree payment gateway charges are non-refundable. If a refund is approved, only the eligible service amount is refunded."],
      ["Non-refundable cases", "Refund may be rejected if the service is completed, payment cannot be verified, incorrect refund details are submitted, or cancellation violates salon policy."]
    ]
  },
  "payment-policy": {
    eyebrow: "Payment Policy",
    title: "Online payment information",
    updated: "30 May 2026",
    sections: [
      ["Accepted payment modes", "Customer service bookings are accepted through Cashfree online checkout only."],
      ["Charges", "Customer online payments may include a Cashfree payment charge shown at checkout. The final payable amount is displayed before payment."],
      ["Payment confirmation", "Booking is confirmed only after successful online payment verification."],
      ["Failed payments", "If a payment fails or remains unverified, the booking may not be confirmed. Customers can try again or contact the salon."],
      ["Payment provider role", "Cashfree and Razorpay are third-party payment providers. They may collect and process payment information according to their own policies."]
    ]
  }
};

export function LegalPage({ page }) {
  const content = legalContent[page] || legalContent["privacy-policy"];

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div
        style={{ borderRadius: "1.75rem", padding: "2rem 1.75rem", boxShadow: "0 20px 60px rgba(0,0,0,0.38)", ...glassCard }}
        className="sm:p-10"
      >
        <p className="section-kicker">{content.eyebrow}</p>
        <h1
          style={{
            marginTop: "0.5rem",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem,5vw,3.5rem)",
            fontWeight: 400,
            lineHeight: 1.1
          }}
        >
          {content.title}
        </h1>
        <p style={{ marginTop: "0.5rem", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-muted)", letterSpacing: "0.06em" }}>
          Last updated: {content.updated}
        </p>
        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {content.sections.map(([heading, text]) => (
            <article
              key={heading}
              style={{ borderRadius: "1.25rem", border: "1px solid var(--color-border)", background: "rgba(9,16,14,0.8)", padding: "1.25rem" }}
            >
              <h2 style={{ fontSize: "0.9375rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.5rem" }}>{heading}</h2>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.75, color: "var(--color-muted)" }}>{text}</p>
            </article>
          ))}
        </div>
        <p
          style={{
            marginTop: "1.25rem",
            borderRadius: "0.875rem",
            border: "1px solid rgba(246,199,106,0.22)",
            background: "rgba(246,199,106,0.06)",
            padding: "0.875rem 1.1rem",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "rgba(246,199,106,0.8)",
            lineHeight: 1.65
          }}
        >
          This page is a business policy template for launch readiness. Review with a qualified professional before final production use.
        </p>
      </div>
    </section>
  );
}
