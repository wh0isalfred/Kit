"use client";

import { useState, type ReactNode } from "react";
import Reveal from "@/components/site/Reveal";

type FaqItem = {
  q: string;
  a: ReactNode[];
  list?: string[];
  outro?: ReactNode;
};

const faqs: FaqItem[] = [
  {
    q: "My child has never coded before. Will they be lost?",
    a: [<><strong>Not at all</strong>. This program is designed for complete beginners, and we&apos;ll guide students step by step from the basics.</>],
  },
  {
    q: "Does my child need to own a laptop?",
    a: [<><strong>Yes</strong>. Each student should have access to a laptop to fully participate in the practical activities and complete their projects.</>],
  },
  {
    q: "What age is this program for?",
    a: [<strong>The summer program is designed for children aged 10–15 years.</strong>],
  },
  {
    q: "Is this online or in person?",
    a: [<><strong>The program is fully online</strong>, allowing students to participate from anywhere with an internet connection.</>],
  },
  {
    q: "What exactly will my child learn?",
    a: ["Students will receive hands-on training in:"],
    list: ["Basic website development", "AI literacy and prompt engineering", "Modern graphic design"],
    outro: "Every lesson is project-based so students apply what they learn immediately.",
  },
  {
    q: "Will my child actually build anything?",
    a: [<><strong>Absolutely.</strong> Every student will create a real business website, design professional graphics for it, and use AI to develop ideas and solve practical problems.</>],
  },
  {
    q: "Who teaches the classes?",
    a: [<>Our classes are taught by <strong>experienced IT professionals</strong> who combine technical expertise with practical, hands-on instruction.</>],
  },
  {
    q: "Is AI safe for children?",
    a: ["Yes. AI is safe when it's taught responsibly. We focus on helping students use AI as a tool for creativity, learning, critical thinking, and problem-solving."],
  },
  {
    q: "How much does the program cost?",
    a: [<>The complete 3-week Summer Tech Program costs <strong>₦15,000.</strong></>],
  },
  {
    q: "What happens after the summer program?",
    a: [<>By the end of the program, your child will have practical experience in web development, graphic design, and AI. Students who want to continue learning can enroll in our <strong>12-week Kids in Tech Program</strong>, which runs alongside the school year and explores these subjects in much greater depth.</>],
  },
  {
    q: "What if my child misses a class?",
    a: [<>No problem. <strong>Every class is recorded</strong>, so students can catch up at their own pace. Our instructors are also available to answer questions and provide additional support whenever needed.</>],
  },
  {
    q: "Why choose KIT instead of a coding school?",
    a: [
      "Traditional coding schools are excellent for children who want to become software developers.",
      <strong key="diff">KIT is different.</strong>,
      <>We prepare children for <strong>any future career</strong> by teaching them how to use technology, AI, and digital tools that are becoming valuable in medicine, engineering, business, law, science, the arts, and many other professions—not just programming.</>,
    ],
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  function toggle(i: number) {
    setOpen((prev) => (prev === i ? null : i));
  }

  return (
    <section className="faq" id="faq">
      <div className="wrap">
        <Reveal className="faq-head">
          <span className="eyebrow">FAQ</span>
          <h2>Questions Parents Ask Most</h2>
          <p>Everything you need to know before enrolling your child.</p>
        </Reveal>

        <div className="faq-list reveal-group">
          {faqs.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} className={`faq-item ${isOpen ? "open" : ""}`}>
                <button
                  className={`faq-q ${isOpen ? "open" : ""}`}
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                >
                  {item.q}
                  <svg className={`faq-chev ${isOpen ? "open" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                <div className={`faq-a-wrap ${isOpen ? "open" : ""}`}>
                  <div className="faq-a">
                    {item.a.map((p, pi) => (
                      <p key={pi}>{p}</p>
                    ))}
                    {item.list && (
                      <ul className="faq-bullets">
                        {item.list.map((li) => (
                          <li key={li}>{li}</li>
                        ))}
                      </ul>
                    )}
                    {item.outro && <p>{item.outro}</p>}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
