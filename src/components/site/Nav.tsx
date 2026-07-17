import Link from "next/link";
import Image from "next/image";

export default function Nav() {
  return (
    <nav>
      <div className="wrap nav-in">
        <Link className="brand" href="/">
          <Image className="logo-img" src="/logo.jpg" alt="KIT logo" width={26} height={30} />
          KIT <span className="ph">PORT HARCOURT</span>
        </Link>
        <div className="nav-links">
          <a href="#programs">Programs</a>
          <a href="#why">Why KIT</a>
          <a href="#summer">Summer</a>
          <Link href="/about">About</Link>
        </div>
        <div className="nav-right">
          <Link className="login" href="/login">Log in</Link>
          <Link className="btn btn-primary" href="/apply">Apply to KIT</Link>
        </div>
      </div>
    </nav>
  );
}