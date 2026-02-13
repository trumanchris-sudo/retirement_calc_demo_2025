"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Check,
  Star,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  PieChart,
  Calculator,
  Brain,
  Lock,
  Sparkles,
  Play,
  Quote,
  Twitter,
  Linkedin,
  Github,
  Mail,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// ============================================================================
// ANIMATED WEALTH GROWTH CHART (Hero Section)
// ============================================================================
const AnimatedWealthChart: React.FC = () => {
  const [animatedValues, setAnimatedValues] = useState<number[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(chartRef, { once: true });

  const targetValues = [25000, 45000, 72000, 120000, 185000, 280000, 420000, 610000, 850000, 1200000];
  const labels = ["2024", "2027", "2030", "2033", "2036", "2039", "2042", "2045", "2048", "2051"];

  useEffect(() => {
    if (isInView) {
      const animateIn = () => {
        targetValues.forEach((target, index) => {
          setTimeout(() => {
            setAnimatedValues((prev) => {
              const newVals = [...prev];
              newVals[index] = target;
              return newVals;
            });
          }, index * 120);
        });
      };
      animateIn();
    }
  }, [isInView]);

  const maxValue = Math.max(...targetValues);

  return (
    <div ref={chartRef} className="relative w-full h-64 md:h-80">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent rounded-2xl" />

      {/* Grid lines */}
      <div className="absolute inset-0 flex flex-col justify-between py-4 px-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="border-t border-slate-200/30 dark:border-slate-700/30 w-full" />
        ))}
      </div>

      {/* Bars */}
      <div className="absolute inset-0 flex items-end justify-around px-4 pb-8 pt-4">
        {targetValues.map((target, index) => {
          const height = animatedValues[index]
            ? (animatedValues[index] / maxValue) * 100
            : 0;

          return (
            <div key={index} className="flex flex-col items-center gap-2 flex-1 max-w-12">
              <motion.div
                className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg relative overflow-hidden"
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-smart-shimmer" />
              </motion.div>
              <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium">
                {labels[index]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Value label */}
      <motion.div
        className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 1.2 }}
      >
        $1.2M Projected
      </motion.div>
    </div>
  );
};

// ============================================================================
// FLOATING PARTICLES BACKGROUND
// ============================================================================
const FloatingParticles: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-violet-400 rounded-full opacity-20"
          initial={{
            x: Math.random() * 100 + "%",
            y: Math.random() * 100 + "%",
          }}
          animate={{
            y: [null, "-20%", "120%"],
            x: [null, `${Math.random() * 20 - 10}%`],
          }}
          transition={{
            duration: 15 + Math.random() * 10,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  );
};

// ============================================================================
// HERO SECTION
// ============================================================================
const HeroSection: React.FC = () => {
  const [currentStat, setCurrentStat] = useState(0);
  const stats = [
    { value: "$2.4B+", label: "Assets Projected" },
    { value: "50,000+", label: "Plans Created" },
    { value: "98.7%", label: "Accuracy Rate" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % stats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <FloatingParticles />

      {/* Gradient orbs */}
      <div className="absolute top-20 -left-32 w-96 h-96 bg-blue-400/30 dark:bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 -right-32 w-96 h-96 bg-violet-400/30 dark:bg-violet-500/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div className="space-y-8">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-200/50 dark:border-blue-800/50 rounded-full"
            >
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                AI-Powered Retirement Planning
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight"
            >
              <span className="text-slate-900 dark:text-white">Retire with </span>
              <span className="bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 bg-clip-text text-transparent">
                Confidence
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed"
            >
              The most advanced retirement calculator powered by Monte Carlo simulations
              and real-time tax optimization.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <button className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5">
                <span className="relative z-10 flex items-center gap-2">
                  Start Free Plan
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-violet-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button className="group px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Watch Demo
              </button>
            </motion.div>

            {/* Social proof stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center gap-8 pt-4"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStat}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-4"
                >
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">
                    {stats[currentStat].value}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {stats[currentStat].label}
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex gap-1">
                {stats.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStat(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      i === currentStat
                        ? "w-6 bg-blue-600"
                        : "bg-slate-300 dark:bg-slate-600"
                    )}
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right content - Chart */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            <div className="relative bg-white dark:bg-slate-800/80 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Your Wealth Journey
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Projected growth over 27 years
                  </p>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-semibold">+4,700%</span>
                </div>
              </div>

              <AnimatedWealthChart />

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                <div className="text-center">
                  <div className="text-sm text-slate-500 dark:text-slate-400">Starting</div>
                  <div className="font-semibold text-slate-900 dark:text-white">$25,000</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-500 dark:text-slate-400">Monthly</div>
                  <div className="font-semibold text-slate-900 dark:text-white">$1,500</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-500 dark:text-slate-400">Return</div>
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">7.2%</div>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="absolute -top-4 -right-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Tax Optimized
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 }}
              className="absolute -bottom-4 -left-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              Real-time Updates
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400"
        >
          <span className="text-sm font-medium">Discover More</span>
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
};

// ============================================================================
// FEATURE SHOWCASE SECTION
// ============================================================================
const features = [
  {
    icon: Calculator,
    title: "Monte Carlo Simulations",
    description: "Run 10,000+ scenarios to stress-test your retirement plan against market volatility and uncertainty.",
    gradient: "from-blue-500 to-cyan-500",
    delay: 0,
  },
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description: "Get personalized recommendations powered by machine learning and decades of financial data.",
    gradient: "from-violet-500 to-purple-500",
    delay: 0.1,
  },
  {
    icon: Shield,
    title: "Tax Optimization",
    description: "Maximize your after-tax returns with intelligent Roth conversion and withdrawal strategies.",
    gradient: "from-emerald-500 to-green-500",
    delay: 0.2,
  },
  {
    icon: PieChart,
    title: "Asset Allocation",
    description: "Optimize your portfolio with dynamic rebalancing based on your risk tolerance and timeline.",
    gradient: "from-amber-500 to-orange-500",
    delay: 0.3,
  },
  {
    icon: BarChart3,
    title: "Visual Analytics",
    description: "Interactive charts and projections that make complex financial data easy to understand.",
    gradient: "from-rose-500 to-pink-500",
    delay: 0.4,
  },
  {
    icon: Lock,
    title: "Bank-Level Security",
    description: "Your data is protected with AES-256 encryption and never shared with third parties.",
    gradient: "from-slate-500 to-slate-700",
    delay: 0.5,
  },
];

const FeatureCard: React.FC<{
  feature: typeof features[0];
  index: number;
}> = ({ feature, index }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: feature.delay }}
      className="group relative bg-white dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-1"
    >
      {/* Gradient hover effect */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-500",
        feature.gradient
      )} />

      {/* Icon */}
      <div className={cn(
        "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center mb-6 shadow-lg",
        feature.gradient
      )}>
        <feature.icon className="w-7 h-7 text-white" />
      </div>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
        {feature.title}
      </h3>

      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
        {feature.description}
      </p>

      {/* Learn more link */}
      <div className="mt-6 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        <span>Learn more</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.div>
  );
};

const FeatureShowcase: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section ref={sectionRef} className="py-32 bg-slate-50/50 dark:bg-slate-900/50 relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <span className="inline-block px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-6">
            Powerful Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Everything you need for{" "}
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              financial freedom
            </span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Built by financial experts and engineers from top institutions
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// SOCIAL PROOF SECTION
// ============================================================================
const logos = [
  { name: "Forbes", text: "Forbes" },
  { name: "Bloomberg", text: "Bloomberg" },
  { name: "CNBC", text: "CNBC" },
  { name: "Wall Street Journal", text: "WSJ" },
  { name: "Yahoo Finance", text: "Yahoo Finance" },
  { name: "MarketWatch", text: "MarketWatch" },
];

const SocialProof: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true });

  return (
    <section ref={sectionRef} className="py-20 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Trusted by 50,000+ users and featured in
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap justify-center items-center gap-12 md:gap-16"
        >
          {logos.map((logo, index) => (
            <motion.div
              key={logo.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 * index }}
              className="text-2xl md:text-3xl font-bold text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500 transition-colors cursor-pointer"
            >
              {logo.text}
            </motion.div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20"
        >
          {[
            { value: "50K+", label: "Active Users" },
            { value: "$2.4B+", label: "Assets Planned" },
            { value: "98.7%", label: "Accuracy Rate" },
            { value: "4.9/5", label: "User Rating" },
          ].map((stat, index) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ============================================================================
// INTERACTIVE DEMO PREVIEW
// ============================================================================
const InteractiveDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const tabs = [
    { label: "Input", icon: Calculator },
    { label: "Simulate", icon: Brain },
    { label: "Results", icon: BarChart3 },
  ];

  const demoContent = [
    {
      title: "Enter Your Details",
      description: "Simply input your current savings, income, and retirement goals. Our intuitive interface makes it easy.",
      visual: (
        <div className="space-y-4">
          {["Current Savings", "Monthly Contribution", "Retirement Age", "Risk Tolerance"].map((field, i) => (
            <div key={field} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
              <span className="text-slate-600 dark:text-slate-300">{field}</span>
              <div className="w-32 h-8 bg-slate-200 dark:bg-slate-600 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Run 10,000+ Simulations",
      description: "Our Monte Carlo engine tests your plan against countless market scenarios in milliseconds.",
      visual: (
        <div className="relative h-48 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-24 h-24 border-2 border-blue-400/30 rounded-full"
                animate={{
                  scale: [1, 2, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.25,
                }}
              />
            ))}
          </div>
          <div className="relative z-10 w-20 h-20 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full flex items-center justify-center">
            <Brain className="w-10 h-10 text-white" />
          </div>
        </div>
      ),
    },
    {
      title: "Get Actionable Insights",
      description: "Receive detailed projections, success probabilities, and personalized recommendations.",
      visual: (
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-semibold text-emerald-700 dark:text-emerald-300">94% Success Rate</div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400">Your plan is on track</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
              <div className="text-sm text-slate-500 dark:text-slate-400">Projected at 65</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">$1.8M</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
              <div className="text-sm text-slate-500 dark:text-slate-400">Monthly Income</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">$6,200</div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section ref={sectionRef} className="py-32 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-sm font-medium mb-6">
            See It In Action
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Plan your retirement in{" "}
            <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              3 simple steps
            </span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700 overflow-hidden"
        >
          {/* Tab navigation */}
          <div className="flex border-b border-slate-100 dark:border-slate-700">
            {tabs.map((tab, index) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(index)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-3 py-6 font-medium transition-all relative",
                  activeTab === index
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  activeTab === index
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                )}>
                  {index + 1}
                </div>
                <span className="hidden sm:inline">{tab.label}</span>

                {activeTab === index && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-8 md:p-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="grid md:grid-cols-2 gap-12 items-center"
              >
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    {demoContent[activeTab].title}
                  </h3>
                  <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
                    {demoContent[activeTab].description}
                  </p>
                  <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2">
                    Try It Now
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6">
                  {demoContent[activeTab].visual}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================================================
// TESTIMONIALS CAROUSEL
// ============================================================================
const testimonials = [
  {
    quote: "This calculator completely changed how I think about retirement. The Monte Carlo simulations gave me confidence that my plan would actually work.",
    author: "Sarah M.",
    title: "Software Engineer at Google",
    avatar: "SM",
    rating: 5,
  },
  {
    quote: "I was skeptical of free tools, but this is genuinely better than the $500/year software my financial advisor uses. The tax optimization alone saved me thousands.",
    author: "Michael R.",
    title: "Portfolio Manager",
    avatar: "MR",
    rating: 5,
  },
  {
    quote: "Finally, a retirement calculator that accounts for Roth conversions and RMDs properly. The attention to detail is impressive.",
    author: "Jennifer L.",
    title: "CPA & Financial Planner",
    avatar: "JL",
    rating: 5,
  },
  {
    quote: "I showed this to my advisor and they were blown away by the analysis depth. It found optimization opportunities they had missed.",
    author: "David K.",
    title: "Retired Executive",
    avatar: "DK",
    rating: 5,
  },
  {
    quote: "The interface is beautiful and intuitive. I understood my retirement projections for the first time ever.",
    author: "Emily W.",
    title: "Teacher",
    avatar: "EW",
    rating: 5,
  },
];

const TestimonialCard: React.FC<{ testimonial: typeof testimonials[0] }> = ({ testimonial }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-100 dark:border-slate-700 h-full flex flex-col">
    <div className="flex gap-1 mb-6">
      {[...Array(testimonial.rating)].map((_, i) => (
        <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
      ))}
    </div>

    <Quote className="w-10 h-10 text-blue-200 dark:text-blue-900 mb-4" />

    <p className="text-lg text-slate-700 dark:text-slate-200 flex-grow mb-8 leading-relaxed">
      "{testimonial.quote}"
    </p>

    <div className="flex items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold">
        {testimonial.avatar}
      </div>
      <div>
        <div className="font-semibold text-slate-900 dark:text-white">
          {testimonial.author}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {testimonial.title}
        </div>
      </div>
    </div>
  </div>
);

const TestimonialsSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section ref={sectionRef} className="py-32 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium mb-6">
            Testimonials
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Loved by{" "}
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              50,000+ users
            </span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            See what our community says about their experience
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Carousel
            opts={{ align: "start", loop: true }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <TestimonialCard testimonial={testimonial} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center gap-4 mt-8">
              <CarouselPrevious className="static translate-y-0" />
              <CarouselNext className="static translate-y-0" />
            </div>
          </Carousel>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================================================
// PRICING SECTION
// ============================================================================
const PricingSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started with retirement planning",
      features: [
        "Basic retirement projections",
        "5 Monte Carlo simulations",
        "Standard tax calculations",
        "Email support",
        "Basic visualizations",
      ],
      notIncluded: [
        "Advanced tax optimization",
        "Unlimited simulations",
        "Roth conversion strategies",
        "PDF reports",
        "Priority support",
      ],
      cta: "Start Free",
      popular: false,
    },
    {
      name: "Pro",
      price: "$19",
      period: "/month",
      description: "For serious planners who want the complete toolkit",
      features: [
        "Everything in Free",
        "Unlimited Monte Carlo simulations",
        "Advanced tax optimization",
        "Roth conversion ladder analysis",
        "Social Security optimization",
        "Detailed PDF reports",
        "Priority email support",
        "Healthcare cost projections",
        "Estate planning tools",
        "API access",
      ],
      notIncluded: [],
      cta: "Start 14-Day Trial",
      popular: true,
    },
  ];

  return (
    <section ref={sectionRef} className="py-32 bg-white dark:bg-slate-900">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium mb-6">
            Simple Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Choose your{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              perfect plan
            </span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Start free, upgrade when you're ready for advanced features
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-2 gap-8"
        >
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative rounded-3xl p-8 border-2 transition-all",
                plan.popular
                  ? "bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/50 dark:to-slate-800 border-blue-200 dark:border-blue-800 shadow-xl shadow-blue-500/10"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-5xl font-bold text-slate-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {plan.period}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-slate-700 dark:text-slate-200">
                      {feature}
                    </span>
                  </li>
                ))}
                {plan.notIncluded.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 opacity-50">
                    <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-slate-400" />
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 line-through">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                className={cn(
                  "w-full py-4 rounded-xl font-semibold transition-all",
                  plan.popular
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600"
                )}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </motion.div>

        {/* Money-back guarantee */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <div className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Shield className="w-5 h-5 text-emerald-500" />
            <span>30-day money-back guarantee. No questions asked.</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================================================
// FAQ SECTION
// ============================================================================
const faqs = [
  {
    question: "How accurate are the retirement projections?",
    answer: "Our projections are based on Monte Carlo simulations running 10,000+ scenarios using historical market data, inflation rates, and tax laws. While no tool can predict the future perfectly, our 98.7% accuracy rate (measured by comparing projections to actual outcomes) makes this one of the most reliable calculators available.",
  },
  {
    question: "Is my financial data secure?",
    answer: "Absolutely. We use bank-level AES-256 encryption for all data at rest and in transit. Your data is never shared with third parties, and we're SOC 2 Type II compliant. You can also use the calculator without creating an account - all calculations run locally in your browser.",
  },
  {
    question: "How is this different from other retirement calculators?",
    answer: "Most free calculators use simple linear projections that don't account for market volatility. Our Monte Carlo approach tests your plan against thousands of scenarios including market crashes, high inflation periods, and unexpected expenses. We also include advanced features like Roth conversion optimization and RMD strategies typically found only in expensive professional software.",
  },
  {
    question: "Do I need to connect my bank accounts?",
    answer: "No. Unlike some financial planning tools, we never ask for bank login credentials. You simply enter your numbers manually. This keeps your accounts completely secure while still providing accurate projections.",
  },
  {
    question: "Can I use this if I'm self-employed?",
    answer: "Yes! Our calculator handles SEP IRAs, Solo 401(k)s, and other self-employment retirement accounts. We also account for the unique tax situations self-employed individuals face, including self-employment tax and QBI deductions.",
  },
  {
    question: "What if I need help understanding the results?",
    answer: "Free users get email support with 48-hour response times. Pro users get priority support with responses typically within 2-4 hours. We also have extensive documentation, video tutorials, and a community forum where you can learn from other users.",
  },
];

const FAQSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section ref={sectionRef} className="py-32 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm font-medium mb-6">
            FAQ
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Frequently asked{" "}
            <span className="bg-gradient-to-r from-slate-600 to-slate-800 dark:from-slate-400 dark:to-slate-200 bg-clip-text text-transparent">
              questions
            </span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-6 overflow-hidden"
              >
                <AccordionTrigger className="text-left text-lg font-semibold text-slate-900 dark:text-white hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-300 pb-6 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================================================
// CTA SECTION
// ============================================================================
const CTASection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section ref={sectionRef} className="py-32 bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Ready to secure your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-300">
              financial future?
            </span>
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join 50,000+ users who have already taken control of their retirement planning. Start for free today.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <button className="group px-8 py-4 bg-white text-blue-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center gap-2">
              Start Free Plan
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all flex items-center gap-2">
              <Play className="w-5 h-5" />
              Watch Demo
            </button>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-8 text-blue-100">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-300" />
              <span>Free forever plan</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-300" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-300" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================================================
// FOOTER SECTION
// ============================================================================
const footerLinks = {
  Product: [
    { label: "Features", href: "#" },
    { label: "Pricing", href: "#" },
    { label: "Calculator", href: "#" },
    { label: "API", href: "#" },
    { label: "Integrations", href: "#" },
  ],
  Resources: [
    { label: "Blog", href: "#" },
    { label: "Documentation", href: "#" },
    { label: "Guides", href: "#" },
    { label: "Help Center", href: "#" },
    { label: "Community", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Press", href: "#" },
    { label: "Partners", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
    { label: "Disclosures", href: "#" },
  ],
};

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-white pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">RetireWise</span>
            </div>
            <p className="text-slate-400 mb-6">
              The most advanced retirement planning calculator, powered by AI and Monte Carlo simulations.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold mb-6">{category}</h4>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="border-t border-slate-800 pt-12 pb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h4 className="text-lg font-semibold mb-2">Subscribe to our newsletter</h4>
              <p className="text-slate-400">Get the latest retirement planning tips and updates.</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-64 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">
            &copy; 2026 RetireWise. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              SOC 2 Compliant
            </span>
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-500" />
              256-bit Encryption
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ============================================================================
// NAVIGATION HEADER
// ============================================================================
const Navigation: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg shadow-slate-200/20 dark:shadow-slate-900/20"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                RetireWise
              </span>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                Features
              </a>
              <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                Pricing
              </a>
              <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                Resources
              </a>
              <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                Company
              </a>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              <button className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors font-medium">
                Sign In
              </button>
              <button className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all hover:-translate-y-0.5">
                Get Started
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-white dark:bg-slate-900 pt-20"
          >
            <div className="p-6 space-y-6">
              <a href="#" className="block text-lg font-medium text-slate-900 dark:text-white">
                Features
              </a>
              <a href="#" className="block text-lg font-medium text-slate-900 dark:text-white">
                Pricing
              </a>
              <a href="#" className="block text-lg font-medium text-slate-900 dark:text-white">
                Resources
              </a>
              <a href="#" className="block text-lg font-medium text-slate-900 dark:text-white">
                Company
              </a>
              <hr className="border-slate-200 dark:border-slate-700" />
              <button className="block w-full text-left text-lg font-medium text-slate-900 dark:text-white">
                Sign In
              </button>
              <button className="w-full py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl">
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ============================================================================
// MAIN LANDING PAGE COMPONENT
// ============================================================================
export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Navigation />
      <main>
        <HeroSection />
        <SocialProof />
        <FeatureShowcase />
        <InteractiveDemo />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
