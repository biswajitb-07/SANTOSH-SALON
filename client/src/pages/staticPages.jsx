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
  Clock3,
  Edit3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Trash2,
  X
} from "lucide-react";
import { ButtonSpinner } from "../components/common.jsx";
import { db } from "../lib/firebase.js";

export function AboutPage() {
  return (
    <>
      <section className="mx-auto flex max-w-7xl justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="luxury-glass relative grid h-72 w-72 place-items-center rounded-full p-3 queue-shadow sm:h-96 sm:w-96">
          <div className="absolute inset-4 rounded-full border border-[#f9c66d]/35" />
          <img
            alt="Santosh Salon owner"
            className="h-full w-full rounded-full object-cover object-[63%_34%]"
            src="/assets/owner-santosh-avatar.png"
          />
          <div className="absolute -bottom-2 left-1/2 w-[86%] -translate-x-1/2 rounded-full border border-[#f9c66d]/25 bg-[#06100e]/88 px-4 py-3 text-center text-white shadow-2xl backdrop-blur">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f9c66d]">
              Owner led service
            </p>
            <p className="font-black">Santosh Salon Queue</p>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-8 sm:px-6 md:grid-cols-3 lg:px-8">
        {[
          ["Fast Tokens", "First come, first serve flow with clear token number."],
          ["Clean Service", "Haircut, beard, wash, and grooming in one place."],
          ["Long Hours", "Open daily from 6 AM to 11 PM for easy visits."]
        ].map(([title, text]) => (
          <article className="luxury-glass rounded-3xl p-5 queue-shadow" key={title}>
            <Star className="text-[#f9c66d]" size={24} />
            <h3 className="mt-4 text-xl font-black">{title}</h3>
            <p className="mt-2 leading-7 text-[#9db2ad]">{text}</p>
          </article>
        ))}
      </section>
    </>
  );
}

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
      ? new Date(updatedMillis || createdMillis).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        })
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

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const loadIssueHistory = async (mobileValue = form.mobile) => {
    const mobile = String(mobileValue || "").replace(/\D/g, "");
    const issueQueries = [];

    if (user?.uid) {
      issueQueries.push(
        firestoreQuery(
          collection(db, "contactIssues"),
          where("userId", "==", user.uid),
          limit(20)
        )
      );
    }

    if (mobile.length >= 10) {
      issueQueries.push(
        firestoreQuery(
          collection(db, "contactIssues"),
          where("mobile", "==", mobile),
          limit(20)
        )
      );
    }

    if (!issueQueries.length) {
      setIssueHistory([]);
      return [];
    }

    setHistoryLoading(true);
    try {
      const snapshots = await Promise.all(
        issueQueries.map((issueQuery) => getDocs(issueQuery))
      );
      const issueMap = new Map();
      snapshots.forEach((snapshot) => {
        snapshot.docs.forEach((snapshotDoc) => {
          issueMap.set(snapshotDoc.id, normalizeIssue(snapshotDoc));
        });
      });
      const issues = [...issueMap.values()]
        .sort((first, second) => second.sortTime - first.sortTime)
        .slice(0, 3);

      setIssueHistory(issues);
      return issues;
    } catch (error) {
      toast.error(error.message || "Issue history could not be loaded.");
      return [];
    } finally {
      setHistoryLoading(false);
    }
  };

  const cleanupIssueHistory = async (mobileValue) => {
    const mobile = String(mobileValue || "").replace(/\D/g, "");
    const issueQueries = [];

    if (user?.uid) {
      issueQueries.push(
        firestoreQuery(
          collection(db, "contactIssues"),
          where("userId", "==", user.uid),
          limit(30)
        )
      );
    }
    if (mobile.length >= 10) {
      issueQueries.push(
        firestoreQuery(
          collection(db, "contactIssues"),
          where("mobile", "==", mobile),
          limit(30)
        )
      );
    }

    const snapshots = await Promise.all(
      issueQueries.map((issueQuery) => getDocs(issueQuery))
    );
    const issueMap = new Map();
    snapshots.forEach((snapshot) => {
      snapshot.docs.forEach((snapshotDoc) => {
        issueMap.set(snapshotDoc.id, normalizeIssue(snapshotDoc));
      });
    });

    const oldIssues = [...issueMap.values()]
      .sort((first, second) => second.sortTime - first.sortTime)
      .slice(3);

    await Promise.all(
      oldIssues.map((issue) => deleteDoc(doc(db, "contactIssues", issue.id)))
    );
  };

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: current.name || user?.displayName || "",
      email: current.email || user?.email || ""
    }));
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
      loadIssueHistory();
    }
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
      const hasOpenIssue = issues.some((issue) =>
        unresolvedIssueStatuses.includes(issue.status)
      );

      if (hasOpenIssue && !editingIssueId) {
        toast.warning(
          "Your previous issue is still open. You can send a new message after it is resolved."
        );
        return;
      }

      if (editingIssueId) {
        await updateDoc(doc(db, "contactIssues", editingIssueId), {
          name,
          mobile,
          email: email || user?.email || "",
          message,
          editedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("Message updated.");
      } else {
        await addDoc(collection(db, "contactIssues"), {
          userId: user?.uid || "",
          name,
          mobile,
          email: email || user?.email || "",
          message,
          status: "open",
          source: "client-contact-page",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("Message sent. The salon team will review your issue.");
      }

      await cleanupIssueHistory(mobile);
      await loadIssueHistory(mobile);

      setEditingIssueId("");
      setForm((current) => ({
        ...current,
        message: ""
      }));
    } catch (error) {
      toast.error(error.message || "Message could not be sent.");
    } finally {
      setSubmitting(false);
    }
  };

  const editIssue = (issue) => {
    setEditingIssueId(issue.id);
    setForm({
      name: issue.name || form.name,
      mobile: issue.mobile || form.mobile,
      email: issue.email || form.email,
      message: issue.message || ""
    });
  };

  const cancelEdit = () => {
    setEditingIssueId("");
    setForm((current) => ({ ...current, message: "" }));
  };

  const deleteIssue = async (issueId) => {
    setDeletingIssueId(issueId);
    try {
      await deleteDoc(doc(db, "contactIssues", issueId));
      if (editingIssueId === issueId) cancelEdit();
      toast.success("Message deleted. You can send a new issue now.");
      await loadIssueHistory();
    } catch (error) {
      toast.error(error.message || "Message could not be deleted.");
    } finally {
      setDeletingIssueId("");
    }
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <aside className="luxury-red-glass rounded-[2rem] p-6 text-white queue-shadow sm:p-8">
        <p className="section-kicker">
          Contact Us
        </p>
        <h1 className="mt-2 text-4xl font-black leading-tight">
          Visit or message the salon.
        </h1>
        <div className="mt-6 space-y-3">
          {[
            [MapPin, "Main Market Road, Near City Chowk"],
            [Phone, "+91 98765 43210"],
            [Mail, "hello@santoshsalon.local"],
            [Clock3, "Open daily, 6 AM - 11 PM"]
          ].map(([Icon, label]) => (
            <div className="flex items-center gap-3 rounded-2xl bg-[rgba(255,255,255,0.08)] p-4" key={label}>
              <Icon className="text-[#f9c66d]" size={20} />
              <span className="font-bold">{label}</span>
            </div>
          ))}
        </div>
      </aside>

      <form
        className="luxury-glass rounded-[2rem] p-6 queue-shadow sm:p-8"
        onSubmit={submitContact}
      >
        <h2 className="text-3xl font-black">Send message</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Name</span>
            <input
              className="h-12 w-full rounded-2xl border border-[#4a2525] bg-[#0b1714] px-4 text-[#f4fbf8] outline-none focus:border-[#f87171]"
              onChange={(event) => updateField("name", event.target.value)}
              value={form.name}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Mobile</span>
            <input
              className="h-12 w-full rounded-2xl border border-[#4a2525] bg-[#0b1714] px-4 text-[#f4fbf8] outline-none focus:border-[#f87171]"
              onChange={(event) => updateField("mobile", event.target.value)}
              placeholder="98765 43210"
              value={form.mobile}
            />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-bold">Email</span>
          <input
            className="h-12 w-full rounded-2xl border border-[#4a2525] bg-[#0b1714] px-4 text-[#f4fbf8] outline-none focus:border-[#f87171]"
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={form.email}
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-bold">Message</span>
          <textarea
            className="min-h-36 w-full resize-y rounded-2xl border border-[#4a2525] bg-[#0b1714] p-4 text-[#f4fbf8] outline-none focus:border-[#f87171]"
            onChange={(event) => updateField("message", event.target.value)}
            placeholder="Write your message"
            value={form.message}
          />
        </label>
        <button
          className="shine-button mt-4 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-6 py-4 font-black text-white disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? <ButtonSpinner /> : <MessageCircle size={19} />}
          {submitting
            ? "Sending..."
            : editingIssueId
              ? "Update Message"
              : "Send Message"}
        </button>
        {editingIssueId ? (
          <button
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#35201f] bg-[#101a18] px-5 font-black text-[#f4fbf8]"
            onClick={cancelEdit}
            type="button"
          >
            <X size={18} />
            Cancel Edit
          </button>
        ) : null}
        <p className="mt-4 rounded-2xl bg-[#2a1111] px-4 py-3 text-sm font-bold text-[#fca5a5]">
          You can keep only one unresolved issue open at a time. A new message
          is allowed after the salon marks your previous issue as resolved.
        </p>
        <div className="mt-5 rounded-3xl border border-[#35201f] bg-[#0b1714] p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black">Recent messages</h3>
            <button
              className="rounded-full border border-[#35201f] px-3 py-1 text-xs font-black text-[#f9c66d]"
              onClick={() => loadIssueHistory()}
              type="button"
            >
              Refresh
            </button>
          </div>
          {historyLoading ? (
            <p className="mt-3 text-sm font-bold text-[#9db2ad]">Loading...</p>
          ) : issueHistory.length ? (
            <div className="mt-3 grid gap-3">
              {issueHistory.map((issue) => (
                <article
                  className="rounded-2xl border border-[#35201f] bg-[#101a18] p-4"
                  key={issue.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="rounded-full bg-[#2a1111] px-3 py-1 text-xs font-black uppercase text-[#fca5a5]">
                        {issue.status.replace(/_/g, " ")}
                      </span>
                      <p className="mt-2 text-xs font-bold text-[#9db2ad]">
                        {issue.displayTime}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="grid h-10 w-10 place-items-center rounded-xl bg-[#24170d] text-[#f9c66d]"
                        onClick={() => editIssue(issue)}
                        type="button"
                      >
                        <Edit3 size={17} />
                      </button>
                      <button
                        className="grid h-10 w-10 place-items-center rounded-xl bg-[#3a1515] text-[#fca5a5] disabled:opacity-60"
                        disabled={deletingIssueId === issue.id}
                        onClick={() => deleteIssue(issue.id)}
                        type="button"
                      >
                        {deletingIssueId === issue.id ? (
                          <ButtonSpinner />
                        ) : (
                          <Trash2 size={17} />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm font-bold leading-6 text-[#f4fbf8]">
                    {issue.message}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm font-bold text-[#9db2ad]">
              No recent messages found.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

const pageShellClass = "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8";

export function PricingPage() {
  const plans = [
    ["Classic Haircut", "Rs. 120", "Token booking with live queue status."],
    ["Beard Styling", "Rs. 80", "Quick grooming slot with clear turn tracking."],
    ["Hair Wash", "Rs. 70", "Fresh wash service with time slot booking."],
    ["Facial Grooming", "Rs. 250", "Premium grooming service with online payment option."]
  ];

  return (
    <section className={pageShellClass}>
      <div className="luxury-red-glass rounded-[2rem] p-6 queue-shadow sm:p-8">
        <p className="section-kicker">Pricing</p>
        <h1 className="mt-2 text-4xl font-black leading-tight sm:text-5xl">
          Transparent grooming prices.
        </h1>
        <p className="mt-3 max-w-3xl text-[#b9c7c3]">
          Final online payable amount can include the Cashfree charge shown at checkout.
          Cash at salon bookings pay the service amount at the counter.
        </p>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {plans.map(([title, price, text]) => (
            <article className="rounded-3xl border border-[#5a2525] bg-[#101a18] p-5" key={title}>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#f9c66d]">
                {title}
              </p>
              <h2 className="mt-3 text-3xl font-black text-white">{price}</h2>
              <p className="mt-2 text-[#9db2ad]">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GalleryPage() {
  const gallery = [
    ["/assets/salon-hero.png", "Santosh Salon interior"],
    ["/assets/haircut-feature.png", "Haircut station"],
    ["/assets/haircut-styles.png", "Haircut style wall"],
    ["/assets/owner-santosh-portrait.png", "Owner portrait"]
  ];

  return (
    <section className={pageShellClass}>
      <div className="luxury-glass rounded-[2rem] p-6 queue-shadow sm:p-8">
        <p className="section-kicker">Gallery</p>
        <h1 className="mt-2 text-4xl font-black leading-tight sm:text-5xl">
          Salon visuals before you visit.
        </h1>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {gallery.map(([src, alt]) => (
            <figure className="overflow-hidden rounded-3xl border border-[#35201f] bg-[#101a18]" key={src}>
              <img alt={alt} className="h-64 w-full object-cover" src={src} />
              <figcaption className="p-4 font-black text-[#f4fbf8]">{alt}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StaffPage() {
  return (
    <section className={pageShellClass}>
      <div className="luxury-glass rounded-[2rem] p-6 queue-shadow sm:p-8">
        <p className="section-kicker">Staff</p>
        <h1 className="mt-2 text-4xl font-black leading-tight sm:text-5xl">
          Three-chair service capacity.
        </h1>
        <p className="mt-3 max-w-3xl text-[#9db2ad]">
          Santosh Salon uses staff capacity to calculate live slot availability,
          waiting list movement, and estimated queue time.
        </p>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {["Haircut specialist", "Beard stylist", "Grooming assistant"].map((role, index) => (
            <article className="rounded-3xl border border-[#35201f] bg-[#101a18] p-5" key={role}>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#2a1111] text-xl font-black text-[#f9c66d]">
                {index + 1}
              </span>
              <h2 className="mt-4 text-xl font-black text-white">{role}</h2>
              <p className="mt-2 text-[#9db2ad]">Live queue work is coordinated through the owner dashboard.</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqPage() {
  const faqs = [
    ["Can I book without OTP?", "Yes. Login is Google-based and checkout asks for name and mobile number."],
    ["Can I book for another person?", "Yes. One checkout can include you and one guest."],
    ["When does waiting list start?", "After confirmed daily capacity is full, eligible online bookings can move to waiting list."],
    ["Are Cashfree charges refundable?", "No. Refunds cover eligible service amount only; Cashfree charges are non-refundable."],
    ["What if payment fails but money is debited?", "Wait for provider or bank auto-reversal, or contact the salon with payment/order ID."]
  ];

  return (
    <section className={pageShellClass}>
      <div className="luxury-glass rounded-[2rem] p-6 queue-shadow sm:p-8">
        <p className="section-kicker">FAQ</p>
        <h1 className="mt-2 text-4xl font-black leading-tight sm:text-5xl">
          Common booking questions.
        </h1>
        <div className="mt-7 grid gap-4">
          {faqs.map(([question, answer]) => (
            <article className="rounded-3xl border border-[#35201f] bg-[#101a18] p-5" key={question}>
              <h2 className="text-xl font-black text-white">{question}</h2>
              <p className="mt-2 leading-7 text-[#9db2ad]">{answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const legalContent = {
  "privacy-policy": {
    eyebrow: "Privacy Policy",
    title: "How Santosh Salon handles customer data",
    updated: "30 May 2026",
    sections: [
      [
        "Information we collect",
        "We collect Google profile details after login, customer name, mobile number, selected service, booking date, time slot, token number, payment status, and refund details when submitted."
      ],
      [
        "How we use data",
        "We use this information to create salon queue tokens, show booking status, contact customers about their visit, process payments, manage refunds, and improve salon operations."
      ],
      [
        "Authentication and payments",
        "Google Authentication is used for login. Online payments may be processed through Cashfree. Payment providers process payment details under their own security and compliance systems."
      ],
      [
        "Data sharing",
        "We do not sell customer data. Data is shared only with service providers required to run authentication, database, hosting, payment, refund, and support workflows."
      ],
      [
        "Data security",
        "Booking data is stored in Firebase Firestore. Access should be protected using Firebase rules, admin authentication, and server-side validation before production launch."
      ],
      [
        "Contact",
        "For privacy requests, contact Santosh Salon at hello@santoshsalon.local or +91 98765 43210."
      ]
    ]
  },
  "terms-and-conditions": {
    eyebrow: "Terms & Conditions",
    title: "Rules for using Santosh Salon Queue",
    updated: "30 May 2026",
    sections: [
      [
        "Service usage",
        "Customers can book salon services, choose available time slots, join queue, and view live booking status. Bookings are subject to salon working hours, staff availability, and operational decisions."
      ],
      [
        "Customer responsibility",
        "Customers must provide correct name and mobile number. Please reach the salon around 40 minutes before your turn for smoother service."
      ],
      [
        "Booking limits",
        "One logged-in customer can create a booking for self and one guest. New booking is restricted while an active booking is waiting, in chair, or waitlisted."
      ],
      [
        "Salon operations",
        "The salon may skip, complete, cancel, transfer, or reschedule bookings due to closing time, staff availability, customer absence, or operational reasons."
      ],
      [
        "Payments",
        "Customers may pay online or choose cash on delivery/cash at salon where available. Online payment confirmation depends on the payment provider response."
      ],
      [
        "Changes",
        "Santosh Salon may update these terms when service rules, pricing, payment flow, or legal requirements change."
      ]
    ]
  },
  "cancellation-refund-policy": {
    eyebrow: "Cancellation & Refund Policy",
    title: "Booking cancellation and refund rules",
    updated: "30 May 2026",
    sections: [
      [
        "Customer cancellation",
        "Customers can cancel eligible waiting or waitlisted bookings from My Bookings. Completed haircut bookings are not eligible for refund."
      ],
      [
        "Cash bookings",
        "Cash on delivery/cash at salon bookings do not require online refund. If a cash waitlist booking is cancelled automatically, no payment refund is applicable."
      ],
      [
        "Online paid bookings",
        "If an online paid booking is cancelled before service completion, the customer can submit a refund request with payment ID or order ID. Refunds are sent back to the original payment method for the eligible service amount only."
      ],
      [
        "Refund review",
        "Refund requests go to the admin panel for verification. Approved refunds are generally processed within 5-7 business days, depending on bank/payment provider timelines."
      ],
      [
        "Payment gateway charges",
        "Cashfree payment gateway charges are non-refundable. If a refund is approved, only the eligible service amount is refunded."
      ],
      [
        "Non-refundable cases",
        "Refund may be rejected if the service is completed, payment cannot be verified, incorrect refund details are submitted, or cancellation violates salon policy."
      ]
    ]
  },
  "payment-policy": {
    eyebrow: "Payment Policy",
    title: "Online and cash payment information",
    updated: "30 May 2026",
    sections: [
      [
        "Accepted payment modes",
        "Customer service bookings may support Cashfree online checkout and cash on delivery/cash at salon."
      ],
      [
        "Charges",
        "Customer online payments may include a Cashfree payment charge shown at checkout. The final payable amount is displayed before payment."
      ],
      [
        "Payment confirmation",
        "Online booking is confirmed only after successful payment verification. Cash bookings are marked as pending payment until paid at the salon."
      ],
      [
        "Failed payments",
        "If a payment fails or remains unverified, the booking may not be confirmed. Customers can try again or contact the salon."
      ],
      [
        "Payment provider role",
        "Cashfree and Razorpay are third-party payment providers. They may collect and process payment information according to their own policies and applicable payment regulations."
      ]
    ]
  }
};

export function LegalPage({ page }) {
  const content = legalContent[page] || legalContent["privacy-policy"];

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="luxury-glass rounded-[2rem] p-6 queue-shadow sm:p-8">
        <p className="section-kicker">
          {content.eyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-black leading-tight sm:text-5xl">
          {content.title}
        </h1>
        <p className="mt-3 text-sm font-bold text-[#637371]">
          Last updated: {content.updated}
        </p>
        <div className="mt-7 grid gap-4">
          {content.sections.map(([heading, text]) => (
            <article className="rounded-3xl border border-[#35201f] bg-[#0b1714] p-5" key={heading}>
              <h2 className="text-xl font-black text-[#f4fbf8]">{heading}</h2>
              <p className="mt-2 leading-7 text-[#9db2ad]">{text}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 rounded-2xl border border-[#f9c66d]/20 bg-[#24170d] px-4 py-3 text-sm font-bold text-[#f9c66d]">
          This page is a business policy template for launch readiness. Review
          with a qualified professional before final production use.
        </p>
      </div>
    </section>
  );
}
