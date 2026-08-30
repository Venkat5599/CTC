import { BlurInHeadline } from "@/components/blur-in-headline";
import { FAQ } from "@/components/faq";
import { FeaturesBento } from "@/components/features-bento";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { Pricing } from "@/components/pricing";
import { Testimonials } from "@/components/testimonials";
import { createMetadata, siteConfig } from "@/lib/metadata";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "React Bits Pro - SaaS Template",
  description: `Welcome to ${siteConfig.name}. ${siteConfig.description}`,
  path: "/",
});

export default function HomePage(): ReactNode {
  return (
    <main id="main-content" className="flex-1">
      <Hero />
      <BlurInHeadline />
      <FeaturesBento />
      <Testimonials />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  );
}
