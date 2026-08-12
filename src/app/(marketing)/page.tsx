import Footer from "@/components/site/Footer";
import Hero from "@/components/home/Hero";
import Programs from "@/components/home/Programs";
import SummerSection from "@/components/home/SummerSection";
import WhyKit from "@/components/home/WhyKit";
import Invite from "@/components/home/Invite";
import EnrollBar from "@/components/home/EnrollBar";
import Ambient from "@/components/site/Ambient"
// import StudentWork from "@/components/home/StudentWork";
import Faq from "@/components/home/Faq";

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      name: "KIT — Kids in Tech",
      url: "https://www.kitacademy.net",
      logo: "https://www.kitacademy.net/favicon/apple-touch-icon.png",
      description:
        "An online tech school where young people aged 10–15 learn to build with technology — web development, AI, Python, and more. Live classes, open to students worldwide.",
      email: "kidsintechph@gmail.com",
      // Founded and based in Port Harcourt — kept because it's true and it's a
      // credibility signal, not because we only serve there.
      address: {
        "@type": "PostalAddress",
        addressLocality: "Port Harcourt",
        addressRegion: "Rivers",
        addressCountry: "NG",
      },
      areaServed: "Worldwide",
      availableLanguage: "en",
    }),
  }}
/>

export default function Home() {
  return (
    <>
       <Ambient />
       <div className="page">
        <Hero />
        <Programs />
        {/* dark interruption between two light sections */}
        <SummerSection />
        <WhyKit />
        {/* <StudentWork /> */}
        {/* answer objections right before the enrollment CTA, not after it */}
        <Faq />
        <Invite />
        <Footer />
      </div> 
      {/* fixed, non-blocking — lives outside .page so it floats over everything */}
      <EnrollBar />
    </>
  );
}
