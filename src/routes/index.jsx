import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Calculator } from "@/components/Calculator";
import { Method } from "@/components/Method";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div id="top" className="min-h-screen bg-brand-cream font-body text-brand-ink">
      <Header />
      <main>
        <Hero />
        <Calculator />
        <Method />
      </main>
      <Footer />
    </div>
  );
}
