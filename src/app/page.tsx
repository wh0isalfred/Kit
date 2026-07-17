import Nav from "@/components/site/Nav"
import Footer from "@/components/site/Footer";
import Hero from "@/components/home/Hero";

export default function Home() {
  return (
    <>
      {/* <Ambient /> */}
       <div className="page">
        <Nav /> 
        <Hero />{/*
        <Programs /> */}
        {/* dark interruption between two light sections */}
        {/* <SummerSection />
        <WhyKit />
        <Invite /> */}
        <Footer />
      </div> 
      {/* fixed, non-blocking — lives outside .page so it floats over everything */}
      {/* <EnrollBar /> */}
    </>
  );
}
