import Link from "next/link";
import Image from "next/image";

export default function Nav() {
  return (
    <nav>
      <div className="wrap nav-in">
        <Link className="brand" href="/">
          <Image className="logo-img" src="/logo.jpg" alt="KIT logo" width={26} height={30} />
          KIT
        </Link>
        <div className="nav-links">
          <a href="#programs">Programs</a>
          <Link href="/about">About</Link>
          <a href="#why">How It Works</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="nav-right">
          <Link className="btn btn-primary" href="/apply">Apply</Link>
          <Link className="btn btn-outline" href="/login">Login</Link>
        </div>
      </div>
    </nav>
  );
}