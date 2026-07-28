import NavBar from "@/components/site/NavBar";
import ScrollProgress from "@/components/site/ScrollProgress";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ScrollProgress />
      <NavBar />
      {children}
    </>
  );
}