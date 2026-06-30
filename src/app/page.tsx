import { SmoothScroll } from "@/components/novsmm/smooth-scroll";
import { ScrollProgress } from "@/components/novsmm/scroll-progress";
import { Navbar } from "@/components/novsmm/navbar";
import { Hero } from "@/components/novsmm/hero";
import { Services } from "@/components/novsmm/services";
import { Marketplace } from "@/components/novsmm/marketplace";
import { Payments } from "@/components/novsmm/payments";
import { Stats } from "@/components/novsmm/stats";
import { Testimonials } from "@/components/novsmm/testimonials";
import { Plans } from "@/components/novsmm/plans";
import { Security } from "@/components/novsmm/security";
import { Footer } from "@/components/novsmm/footer";
import { AppView } from "@/components/novsmm/app-view";

export default function Home() {
  return (
    <SmoothScroll>
      <div className="relative flex min-h-screen flex-col bg-background">
        <ScrollProgress />
        <AppView
          landing={
            <>
              <Navbar />
              <main className="flex-1">
                <Hero />
                <Services />
                <Marketplace />
                <Payments />
                <Stats />
                <Testimonials />
                <Plans />
                <Security />
              </main>
              <Footer />
            </>
          }
        />
      </div>
    </SmoothScroll>
  );
}
