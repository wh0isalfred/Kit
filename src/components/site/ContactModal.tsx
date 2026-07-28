"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type Method = {
  key: string;
  label: string;
  detail: string;
  href: string;
  icon: "email" | "whatsapp" | "instagram" | "facebook";
  disabled?: boolean;
};

/* Facebook is a placeholder — page isn't set up yet, so this is
   rendered disabled rather than linking somewhere that may not
   exist. Swap `disabled` for a real href once the page is live. */
const methods: Method[] = [
  {
    key: "email",
    label: "Email",
    detail: "kidsintechph@gmail.com",
    href: "mailto:kidsintechph@gmail.com",
    icon: "email",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    detail: "+234 916 979 9215",
    href: "https://wa.me/2349169799215",
    icon: "whatsapp",
  },
  {
    key: "instagram",
    label: "Instagram",
    detail: "@kidsintechph",
    href: "https://www.instagram.com/kidsintechph",
    icon: "instagram",
  },
  {
    key: "facebook",
    label: "Facebook",
    detail: "Coming soon",
    href: "#",
    icon: "facebook",
    disabled: true,
  },
];

function MethodIcon({ name }: { name: Method["icon"] }) {
  const c = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "email":
      return (
        <svg {...c}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 6l9 7 9-7" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...c}>
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...c}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...c}>
          <path d="M15 4h-1.5A3.5 3.5 0 0010 7.5V10H7.5v3H10v7h3v-7h2.5l.5-3H13V7.5a.5.5 0 01.5-.5H15z" />
        </svg>
      );
  }
}

export default function ContactModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="contact-modal-backdrop" onClick={onClose}>
      <div
        className="contact-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="contact-modal-close" aria-label="Close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <h2 id="contact-modal-title">Get in touch</h2>
        <p>Pick whichever&apos;s easiest — we&apos;ll take it from there.</p>

        <div className="contact-modal-grid">
          {methods.map((m) =>
            m.disabled ? (
              <div key={m.key} className="contact-method disabled" aria-disabled="true">
                <span className="contact-method-icon">
                  <MethodIcon name={m.icon} />
                </span>
                <div>
                  <div className="contact-method-label">{m.label}</div>
                  <div className="contact-method-detail">{m.detail}</div>
                </div>
              </div>
            ) : (
              <a
                key={m.key}
                className="contact-method"
                href={m.href}
                target={m.icon === "email" ? undefined : "_blank"}
                rel={m.icon === "email" ? undefined : "noopener noreferrer"}
                onClick={onClose}
              >
                <span className="contact-method-icon">
                  <MethodIcon name={m.icon} />
                </span>
                <div>
                  <div className="contact-method-label">{m.label}</div>
                  <div className="contact-method-detail">{m.detail}</div>
                </div>
              </a>
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
