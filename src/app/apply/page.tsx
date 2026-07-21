import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import ApplyHero from "@/components/apply/ApplyHero";
import ApplicationForm from "@/components/apply/ApplicationForm";
import ApplySidebar from "@/components/apply/ApplySidebar";
import TrustBar from "@/components/apply/TrustBar";
import ApplyCTA from "@/components/apply/ApplyCTA";
import { getLiveCourses } from "@/lib/courses";


export default async function ApplyPage() {

const courses = await getLiveCourses();

  return (
    <div className="page">
      <Nav />
      <ApplyHero />

      <section id="apply-form" className="apply-form-section">
        <div className="wrap">
          <div className="apply-form-card">
            <ApplicationForm courses={courses} />
            <ApplySidebar />
          </div>
        </div>
      </section>

      <TrustBar />
      <ApplyCTA />
      <Footer />
    </div>
  );
}
