import Nav from "@/components/site/Nav"
import Footer from "@/components/site/Footer";
import Hero from "@/components/home/Hero";
import Programs from "@/components/home/Programs";
import SummerSection from "@/components/home/SummerSection";
import WhyKit from "@/components/home/WhyKit";
import Invite from "@/components/home/Invite";
import EnrollBar from "@/components/home/EnrollBar";
import Ambient from "@/components/site/Ambient"

export default function Home() {
  return (
    <>
       <Ambient />
       <div className="page">
        <Nav /> 
        <Hero />
        <Programs />
        {/* dark interruption between two light sections */}
        <SummerSection />
        <WhyKit />
        <Invite />
        <Footer />
      </div> 
      {/* fixed, non-blocking — lives outside .page so it floats over everything */}
      <EnrollBar />
    </>
  );
}
