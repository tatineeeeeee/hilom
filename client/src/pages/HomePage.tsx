import { Hero } from "./home/Hero";
import { TrustBand } from "./home/TrustBand";
import { FeatureCards } from "./home/FeatureCards";
import { HowItWorks } from "./home/HowItWorks";
import { FeaturedDoctors } from "./home/FeaturedDoctors";
import { SpecializationsGrid } from "./home/SpecializationsGrid";
import { Testimonials } from "./home/Testimonials";
import { FAQ } from "./home/FAQ";
import { CTASplit } from "./home/CTASplit";
import { Footer } from "./home/Footer";

export const HomePage = () => (
  <div className="bg-gradient-to-b from-background via-background to-primary/5">
    <Hero />
    <TrustBand />
    <FeatureCards />
    <HowItWorks />
    <FeaturedDoctors />
    <SpecializationsGrid />
    <Testimonials />
    <FAQ />
    <CTASplit />
    <Footer />
  </div>
);
