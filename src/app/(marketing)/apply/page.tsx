import Footer from "@/components/site/Footer";
import ApplyHero from "@/components/apply/ApplyHero";
import ApplicationForm from "@/components/apply/ApplicationForm";
import ApplySidebar from "@/components/apply/ApplySidebar";
import TrustBar from "@/components/apply/TrustBar";
import ApplyCTA from "@/components/apply/ApplyCTA";
import { getLiveCourses } from "@/lib/courses";


export const metadata = {
  title: "Apply",
  description:
    "Enrol your child at KIT. Summer Build Camp and the 12-week Future Skills Lab for ages 10–15, taught live online — join from anywhere in the world.",
  alternates: { canonical: "/apply" },
};

export default async function ApplyPage() {

const courses = await getLiveCourses();

  return (
    <div className="page">
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
