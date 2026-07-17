import Link from "next/link";
import Reveal from "../site/Reveal";

const check = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const arrow = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function Programs() {
  return (
    <section className="programs" id="programs">
      <div className="wrap">
        <Reveal className="p-head">
          <span className="eyebrow">Programs</span>
          <h2>What do you want to create?</h2>
          <p>
            Learn real tech skills by building websites, AI tools, games, and
            future projects. Start with one path — and grow as new programs
            arrive.
          </p>
        </Reveal>

        <div className="p-grid">
          {/* Web Development */}
          <Reveal className="pcard">
            <div className="pviz web" aria-hidden="true">
              <div className="browser">
                <div className="bar"><i /><i /><i /></div>
                <div className="body">
                  <div className="h" />
                  <div className="row"><div className="blk c" /><div className="blk" /><div className="blk" /></div>
                  <div className="ln" />
                  <div className="ln s" />
                </div>
              </div>
            </div>
            <div className="pbody">
              <span className="pmark web">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" /></svg>
                WEB DEVELOPMENT
              </span>
              <h3>Build websites people actually use.</h3>
              <p className="desc">
                Create your own websites from scratch, using the same tools
                professional developers use every day.
              </p>
              <div className="build-label">You&apos;ll build</div>
              <div className="chips">
                <span className="chip">{check}Personal websites</span>
                <span className="chip">{check}Landing pages</span>
                <span className="chip">{check}Interactive projects</span>
              </div>
              <Link className="more" href="/programs/web-development">
                Explore Web Development{arrow}
              </Link>
            </div>
          </Reveal>

          {/* Artificial Intelligence */}
          <Reveal className="pcard">
            <div className="pviz ai" aria-hidden="true">
              <div className="chat">
                <div className="bub u">How do I make a chatbot?</div>
                <div className="bub a"><span className="dot" />Let&apos;s build one together.</div>
                <div className="bub typing"><span /><span /><span /></div>
              </div>
            </div>
            <div className="pbody">
              <span className="pmark ai">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="12" cy="12" r="3" /><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" /></svg>
                ARTIFICIAL INTELLIGENCE
              </span>
              <h3>Teach computers to solve problems.</h3>
              <p className="desc">
                Learn how AI really works, then build your own smart tools,
                chatbots, and assistants.
              </p>
              <div className="build-label">You&apos;ll build</div>
              <div className="chips">
                <span className="chip">{check}AI chatbots</span>
                <span className="chip">{check}Smart apps</span>
                <span className="chip">{check}Automation tools</span>
              </div>
              <Link className="more" href="/programs/ai">
                Explore AI{arrow}
              </Link>
            </div>
          </Reveal>
        </div>

        <Reveal className="p-soon">
          <div className="lbl">More on the way</div>
          <div className="soon-row">
            <span className="soon-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" /><line x1="15" y1="13" x2="15.01" y2="13" /><line x1="18" y1="11" x2="18.01" y2="11" /><rect x="2" y="6" width="20" height="12" rx="2" /></svg>
              Game Development
            </span>
            <span className="soon-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2.5" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
              App Building
            </span>
            <span className="soon-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="9" width="14" height="10" rx="2" /><path d="M12 9V5M9 5h6" /><circle cx="9" cy="14" r="1" /><circle cx="15" cy="14" r="1" /></svg>
              Robotics
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}