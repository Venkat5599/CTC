"use client";

import { LogoLoop, type LogoItem } from "@/components/logo-loop";
import { ArrowDownRight } from "lucide-react";
import { motion, useMotionValue, useSpring } from "motion/react";
import Image from "next/image";
import { useRef, type ReactNode, type MouseEvent } from "react";

const ease = [0.23, 1, 0.32, 1] as const;

const fadeInUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.95, filter: "blur(8px)" },
  visible: { opacity: 1, scale: 1, filter: "blur(0px)" },
};

const logos: LogoItem[] = [
  { node: <Image src="/mock-logos/acmecorp.svg" alt="Acme Corp" width={120} height={32} className="h-[1em] w-auto" /> },
  { node: <Image src="/mock-logos/altshift.svg" alt="Altshift" width={120} height={32} className="h-[1em] w-auto" /> },
  { node: <Image src="/mock-logos/biosynthesis.svg" alt="Biosynthesis" width={120} height={32} className="h-[1em] w-auto" /> },
  { node: <Image src="/mock-logos/boltshift.svg" alt="Boltshift" width={120} height={32} className="h-[1em] w-auto" /> },
  { node: <Image src="/mock-logos/capsule.svg" alt="Capsule" width={120} height={32} className="h-[1em] w-auto" /> },
  { node: <Image src="/mock-logos/catalog.svg" alt="Catalog" width={120} height={32} className="h-[1em] w-auto" /> },
  { node: <Image src="/mock-logos/cloudwatch.svg" alt="Cloudwatch" width={120} height={32} className="h-[1em] w-auto" /> },
  { node: <Image src="/mock-logos/commandr.svg" alt="Commandr" width={120} height={32} className="h-[1em] w-auto" /> },
];

const PARALLAX_INTENSITY = 20;

export function Hero(): ReactNode {
  const sectionRef = useRef<HTMLElement>(null);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 25, stiffness: 150 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (!sectionRef.current) return;
    
    if (window.innerWidth < 850) return;
    
    const rect = sectionRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const offsetX = (e.clientX - centerX) / (rect.width / 2);
    const offsetY = (e.clientY - centerY) / (rect.height / 2);
    
    mouseX.set(offsetX * PARALLAX_INTENSITY);
    mouseY.set(offsetY * PARALLAX_INTENSITY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <section 
      ref={sectionRef}
      className="flex flex-col relative" 
      style={{ colorScheme: 'light' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div 
        className="absolute inset-0 min-[850px]:inset-2.5 bg-cover bg-center bg-no-repeat -z-10 brightness-125 rounded-br-4xl rounded-bl-4xl min-[850px]:scale-105"
        style={{ 
          backgroundImage: 'url(/BG.jpg)',
          x,
          y,
        }}
        aria-hidden="true"
      />
      
      <div className="flex items-start justify-center px-6 pt-64 max-[850px]:pt-32">
        <motion.div
          className="flex flex-col items-center max-[850px]:items-start text-center max-[850px]:text-left max-w-4xl max-[850px]:w-full"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.15, delayChildren: 0.2 }}
        >
          <motion.div
            className="inline-flex items-center gap-1.5 pl-4 pr-3 py-1.5 rounded-xl border border-black/10 bg-white text-black text-sm font-medium mb-6"
            variants={fadeInUp}
            transition={{ duration: 0.8, ease }}
          >
            Now Available
            <span className="text-accent">✦</span>
          </motion.div>

          <h1 className="text-8xl max-[850px]:text-5xl font-medium tracking-tight leading-[1.1] mb-6 text-black">
            <motion.span
              className="block"
              variants={fadeInUp}
              transition={{ duration: 0.8, ease }}
            >
              Build Faster
            </motion.span>
            <motion.span
              className="block"
              variants={fadeInUp}
              transition={{ duration: 0.8, ease }}
            >
              Ship with <span className="italic font-serif text-accent">Confidence</span>
            </motion.span>
          </h1>

          <motion.p
            className="text-lg text-neutral-600 mb-8"
            variants={fadeInUp}
            transition={{ duration: 0.8, ease }}
          >
            The modern platform for teams who want to move fast without breaking things
          </motion.p>

          <motion.button
            type="button"
            className="group relative cursor-pointer inline-flex items-center max-[850px]:w-full"
            variants={fadeInScale}
            transition={{ duration: 0.8, ease }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="absolute right-0 inset-y-0 w-[calc(100%-2rem)] max-[850px]:w-full rounded-xl bg-accent" />
            <span className="relative z-10 px-6 py-3 rounded-xl bg-black text-white font-medium max-[850px]:flex-1">Get Started</span>
            <span className="relative -left-px z-10 w-11 h-11 rounded-xl flex items-center justify-center text-black">
              <ArrowDownRight className="w-5 h-5 transition-transform duration-300 group-hover:-rotate-45" />
            </span>
          </motion.button>
        </motion.div>
      </div>

      <motion.div
        className="relative px-6 mt-24 max-[850px]:mt-10"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6, ease }}
      >
        <div className="relative max-w-5xl mx-auto">
          <div 
            className="relative dark:mix-blend-darken rounded-2xl overflow-hidden border border-neutral-200 shadow-2xl/5 mask-[linear-gradient(to_bottom,black_50%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)]"
          >
            <Image
              src="/dashboardmock.png"
              alt="Dashboard preview"
              width={1920}
              height={1080}
              className="w-full h-auto invert dark:invert-0 dark:contrast-100 contrast-125"
              priority
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        className="pt-24 pb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1, ease }}
      >
        <LogoLoop logos={logos} speed={60} logoHeight={42} gap={124} />
      </motion.div>
    </section>
  );
}
