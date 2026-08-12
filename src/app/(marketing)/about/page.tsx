import Link from "next/link";
import Footer from "@/components/site/Footer";
import Reveal from "@/components/site/Reveal";
import ScrollProgress from "@/components/site/ScrollProgress";

export const metadata = {
  title: "About",
  description:
    "KIT is an online tech school for ages 10–15, founded in Port Harcourt and now teaching students across Nigeria, the UK, and beyond. We don't just teach technology — we prepare children to build with it.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <div className="page">
        <ScrollProgress />
        <Reveal as="div">
        {/* Hero Section */}
        <section className="about-hero">
          <div className="wrap about-hero-wrap">
            <div className="about-hero-content">
              <span className="about-eyebrow">About KIT</span>
              <h1 className="about-hero-heading">
                We don&apos;t just teach<br />
                technology.<br />
                We prepare children<br />
                for <span className="text-highlight">what&apos;s next.</span>
              </h1>
              <div className="heading-underline"></div>

              <div className="about-hero-bullets">
                <div className="bullet-item">
                  <span className="bullet-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="bullet-icon">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="5" />
                    </svg>
                  </span>
                  <span>
                    <strong>Every profession is changing because of technology.</strong> The children who understand how to use it will have opportunities that others won&apos;t.
                  </span>
                </div>

                <div className="bullet-item">
                  <span className="bullet-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="bullet-icon">
                      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                      <path d="M9 18h6" />
                      <path d="M10 22h4" />
                    </svg>
                  </span>
                  <span>
                    <strong>Our goal isn&apos;t to turn every child into a programmer.</strong> It&apos;s to help them think critically, create confidently, and solve real problems using the tools that are shaping every industry.
                  </span>
                </div>

                <div className="bullet-item">
                  <span className="bullet-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="bullet-icon">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                  </span>
                  <span>
                    <strong>That&apos;s why every KIT class is hands-on.</strong> Students don&apos;t just watch lessons—they build websites, design graphics, explore AI, and complete projects they can proudly show off.
                  </span>
                </div>

                <div className="bullet-item">
                  <span className="bullet-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="bullet-icon">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </span>
                  <span>
                    <strong>Because we believe the best way to prepare children for the future is to give them the confidence to start building it today.</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="about-hero-image">
              <div className="image-card">
                <img src="/cute_baby.webp" alt="Child with laptop" />

                <svg className="card-dots dots-tl" viewBox="0 0 60 60" fill="none">
                  {[0, 1, 2, 3].map((row) =>
                    [0, 1, 2, 3].map((col) => (
                      <circle key={`tl-${row}-${col}`} cx={6 + col * 16} cy={6 + row * 16} r="2" fill="#ffffff" fillOpacity="0.55" />
                    ))
                  )}
                </svg>

                <svg className="card-dots dots-br" viewBox="0 0 60 60" fill="none">
                  {[0, 1, 2, 3].map((row) =>
                    [0, 1, 2, 3].map((col) => (
                      <circle key={`br-${row}-${col}`} cx={6 + col * 16} cy={6 + row * 16} r="2" fill="#ffffff" fillOpacity="0.55" />
                    ))
                  )}
                </svg>
              </div>

              <div className="about-quote-box">
                <svg className="quote-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                  <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
                </svg>
                <p className="quote-text">
                  &quot;Today&apos;s children won&apos;t compete with AI. They&apos;ll compete with people who know how to use it.&quot;
                </p>
                <p className="quote-attr">— KIT</p>
              </div>
            </div>
          </div>

          {/* Pillars Row */}
          <div className="wrap">
            <div className="pillars-row">
              <div className="pillar-item">
                <div className="pillar-icon acc-blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                    <line x1="12" y1="20" x2="12.01" y2="20" />
                  </svg>
                </div>
                <div className="pillar-text">
                  <h3>Live Online Classes</h3>
                  <p>Interactive. Engaging. Real-time.</p>
                </div>
              </div>

              <div className="pillar-item">
                <div className="pillar-icon acc-green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="11" rx="1.2" />
                    <path d="M2 19h20" />
                  </svg>
                </div>
                <div className="pillar-text">
                  <h3>Real Projects</h3>
                  <p>Build. Create. Showcase.</p>
                </div>
              </div>

              <div className="pillar-item">
                <div className="pillar-icon acc-purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="pillar-text">
                  <h3>Expert Mentors</h3>
                  <p>Guide. Support. Inspire.</p>
                </div>
              </div>

              <div className="pillar-item">
                <div className="pillar-icon acc-amber">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                </div>
                <div className="pillar-text">
                  <h3>Confidence for Life</h3>
                  <p>Skills today. Opportunities tomorrow.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Reveal>
        <Footer />
      </div>
    </>
  );
}