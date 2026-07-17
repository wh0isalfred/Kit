import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import AboutHero from "@/components/about/AboutHero";

export default function AboutPage() {
  return (
    <>
      <div className="page">
        <Nav />
        <AboutHero />
        <Footer />
      </div>
    </>
  );
}
