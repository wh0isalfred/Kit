import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import ApplyHero from "@/components/apply/ApplyHero";

export default function ApplyPage() {
  return (
    <div className="page">
      <Nav />
      <ApplyHero />
      {/* ApplicationForm + ApplySidebar, TrustBar, ApplyCTA go here */}
      <Footer />
    </div>
  );
}
