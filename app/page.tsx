import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnalyzerTool } from "@/components/AnalyzerTool";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 sm:px-8">
      <Header />
      <AnalyzerTool />
      <Footer />
    </main>
  );
}
