"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Hand, MousePointer2, Database, MessageSquare, FileText, Sparkles } from "lucide-react";
import type { BestMouse } from "@/lib/reportStore";
import { buildBestMouseFromStorage } from "@/lib/reportStore";
import { ShellNav } from "@/components/shell/ShellNav";

const features = [
  {
    title: "Hand Measure",
    description: "Precise hand measurement using AI",
    icon: Hand,
    href: "/measure",
    color: "from-green-500/20 to-green-600/10",
  },
  {
    title: "Grip Analysis",
    description: "Detect your natural grip style",
    icon: MousePointer2,
    href: "/grip",
    color: "from-emerald-500/20 to-emerald-600/10",
  },
  {
    title: "Mouse Database",
    description: "Browse 200+ mice with specs",
    icon: Database,
    href: "/database",
    color: "from-teal-500/20 to-teal-600/10",
  },
  {
    title: "AI Assistant",
    description: "Get personalized recommendations",
    icon: MessageSquare,
    href: "/ai",
    color: "from-cyan-500/20 to-cyan-600/10",
  },
];

export default function DashboardPage() {
  const [bestMouse, setBestMouse] = useState<BestMouse | null>(null);

  useEffect(() => {
    setBestMouse(buildBestMouseFromStorage());
    
    // Ensure camera is stopped on dashboard
    if (typeof window !== 'undefined') {
      if ((window as any).stopCam) {
        try { (window as any).stopCam(); } catch (e) {}
      }
      if ((window as any).stopCamGrip) {
        try { (window as any).stopCamGrip(); } catch (e) {}
      }
      
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }
      });
    }
  }, []);

  return (
    <>
      <ShellNav currentPage="dashboard" />
      
      <div className="px-6 md:px-12 lg:px-20 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-green-500" />
            <span className="text-xs tracking-[0.3em] text-white/40 uppercase">Dashboard</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-white mb-4">
            Welcome to <span className="text-green-500">MouseFit</span>
          </h1>
          <p className="text-white/50 max-w-xl">
            Find your perfect mouse match through precision hand measurement and AI-powered recommendations.
          </p>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feature Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                >
                  <Link href={feature.href}>
                    <div className={`group relative h-full p-6 rounded-2xl border border-white/10 bg-gradient-to-br ${feature.color} backdrop-blur-sm hover:border-green-500/30 transition-all duration-300`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-green-500/30 transition-colors">
                          <Icon className="w-6 h-6 text-green-500" />
                        </div>
                        <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:border-green-500 group-hover:bg-green-500 transition-all duration-300">
                          <ArrowRight className="w-4 h-4 text-white group-hover:text-black" />
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">{feature.title}</h3>
                      <p className="text-sm text-white/50">{feature.description}</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Right Column - Results Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-4"
          >
            {/* Best Match Card */}
            <div className="p-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Your Best Match</h3>
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              
              {bestMouse ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-2xl font-medium text-white mb-1">{bestMouse.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500 font-medium">{Math.round(bestMouse.score)}%</span>
                      <span className="text-white/40">match</span>
                    </div>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/50">Hand Size</span>
                      <span className="text-white">{bestMouse.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Grip Style</span>
                      <span className="text-white">{bestMouse.recommendedGrip}</span>
                    </div>
                  </div>
                  <Link 
                    href="/report"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-500 text-black font-medium hover:bg-green-400 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    View Report
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-white/40 mb-4">No results yet</p>
                  <Link 
                    href="/measure"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500/20 text-green-500 border border-green-500/30 hover:bg-green-500 hover:text-black transition-all"
                  >
                    <Hand className="w-4 h-4" />
                    Start Measuring
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="p-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm">
              <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link 
                  href="/grip"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <span className="text-white/80">Check Grip Style</span>
                  <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-green-500 transition-colors" />
                </Link>
                <Link 
                  href="/database"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <span className="text-white/80">Browse Mice</span>
                  <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-green-500 transition-colors" />
                </Link>
                <Link 
                  href="/ai"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <span className="text-white/80">Ask AI</span>
                  <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-green-500 transition-colors" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
