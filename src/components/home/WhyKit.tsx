import Reveal from "@/components/site/Reveal";

export default function WhyKit() {
  return (
    <section className="why" id="why">
      <div className="wrap">
        <Reveal className="why-head">
          <span className="eyebrow">Why KIT</span>
          <h2>A school built to make builders.</h2>
        </Reveal>

        <div className="why-grid">
          <Reveal className="why-col">
            <div className="why-img n">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M3 20h2M14 4l6 6L8 22l-6 1 1-6z" /></svg>
            </div>
            <h3>You build from day one</h3>
            <p>Every lesson ends in something real you made — not a video you sat and watched.</p>
          </Reveal>

          <Reveal className="why-col">
            <div className="why-img b">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" /><path d="M16 4.5a3.2 3.2 0 010 6M22 20c0-2.4-1.6-4.3-4-4.8" /></svg>
            </div>
            <h3>Taught by real builders</h3>
            <p>Small classes led by people who design and engineer for a living — and who know your child by name.</p>
          </Reveal>

          <Reveal className="why-col">
            <div className="why-img g">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8" /><path d="M21 7v5h-5" /></svg>
            </div>
            <h3>Skills that go somewhere</h3>
            <p>Students leave with finished work they&apos;re proud of, and the confidence to keep building on their own.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}