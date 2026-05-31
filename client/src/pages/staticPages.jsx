import { useState } from "react";
import {
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Star
} from "lucide-react";

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
          ["Long Hours", "Open daily from 7 AM to 11 PM for easy visits."]
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

export function ContactPage() {
  const [sent, setSent] = useState(false);

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
            [Clock3, "Open daily, 7 AM - 11 PM"]
          ].map(([Icon, label]) => (
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4" key={label}>
              <Icon className="text-[#f9c66d]" size={20} />
              <span className="font-bold">{label}</span>
            </div>
          ))}
        </div>
      </aside>

      <form
        className="luxury-glass rounded-[2rem] p-6 queue-shadow sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          setSent(true);
        }}
      >
        <h2 className="text-3xl font-black">Send message</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Name</span>
            <input className="h-12 w-full rounded-2xl border border-[#4a2525] bg-[#0b1714] px-4 text-[#f4fbf8] outline-none focus:border-[#f87171]" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Mobile</span>
            <input className="h-12 w-full rounded-2xl border border-[#4a2525] bg-[#0b1714] px-4 text-[#f4fbf8] outline-none focus:border-[#f87171]" />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-bold">Message</span>
          <textarea
            className="min-h-36 w-full resize-y rounded-2xl border border-[#4a2525] bg-[#0b1714] p-4 text-[#f4fbf8] outline-none focus:border-[#f87171]"
            placeholder="Write your message"
          />
        </label>
        <button className="shine-button mt-4 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-6 py-4 font-black text-white">
          <MessageCircle size={19} />
          Send Message
        </button>
        {sent ? (
          <p className="mt-4 rounded-2xl bg-[#2a1111] px-4 py-3 text-sm font-bold text-[#fca5a5]">
            Message ready. Connect backend/email service when needed.
          </p>
        ) : null}
      </form>
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
