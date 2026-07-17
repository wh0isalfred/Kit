import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-in">
          <div>
            <div className="foot-brand">
              <Image className="logo-img foot" src="/logo.jpg" alt="KIT logo" width={22} height={26} />
              KIT
            </div>
            <p className="foot-tag">
              A tech school for young builders. Port Harcourt, Nigeria.
            </p>
          </div>
          <div className="foot-cols">
            <div className="foot-col">
              <h5>School</h5>
              <a href="#programs">Programs</a>
              <a href="#why">Why KIT</a>
              <Link href="/about">About</Link>
            </div>
            <div className="foot-col">
              <h5>Students</h5>
              <Link href="/apply">Apply</Link>
              <Link href="/login">Log in</Link>
              <Link href="/summer">Summer</Link>
            </div>
            <div className="foot-col">
              <h5>Reach us</h5>
              <a href="mailto:hello@kit.ng">hello@kit.ng</a>
              <a href="#">WhatsApp</a>
              <a href="#">Instagram</a>
            </div>
          </div>
        </div>
        <div className="foot-bot">
          <span>© 2026 KIT · Port Harcourt</span>
          <span>The future of tech starts here.</span>
        </div>
      </div>
    </footer>
  );
}