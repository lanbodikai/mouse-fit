"use client";

import { motion } from "framer-motion";
import { User, Mail, Hand, MousePointer2, Calendar, Edit2 } from "lucide-react";
import { ShellNav } from "@/components/shell/ShellNav";
import { useEffect, useState } from "react";

export default function UserPage() {
  const [handData, setHandData] = useState<{ length: string; width: string } | null>(null);
  const [gripData, setGripData] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const length = sessionStorage.getItem('mf:length_mm');
      const width = sessionStorage.getItem('mf:width_mm');
      const grip = sessionStorage.getItem('mf:grip');
      
      if (length && width) {
        setHandData({ 
          length: (parseFloat(length) / 10).toFixed(1), 
          width: (parseFloat(width) / 10).toFixed(1) 
        });
      }
      if (grip) {
        setGripData(grip);
      }
    }
  }, []);

  return (
    <>
      <ShellNav currentPage="user" />
      
      <div className="px-6 md:px-12 lg:px-20 max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-light text-white mb-2">Profile</h1>
          <p className="text-white/50">Your MouseFit profile and measurements</p>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="p-8 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm mb-6"
        >
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 flex items-center justify-center">
              <User className="w-10 h-10 text-green-500" />
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-medium text-white mb-1">Guest User</h2>
                  <p className="text-white/50 text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Sign in to save your data
                  </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <Edit2 className="w-4 h-4 text-white/60" />
                  <span className="text-white/80 text-sm">Edit</span>
                </button>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-white/40">
                <Calendar className="w-4 h-4" />
                <span>Member since {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Measurements Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="p-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm mb-6"
        >
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Hand className="w-5 h-5 text-green-500" />
            Hand Measurements
          </h3>
          
          {handData ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/50 text-sm mb-1">Hand Length</p>
                <p className="text-2xl font-medium text-white">{handData.length} <span className="text-sm text-white/50">cm</span></p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/50 text-sm mb-1">Palm Width</p>
                <p className="text-2xl font-medium text-white">{handData.width} <span className="text-sm text-white/50">cm</span></p>
              </div>
            </div>
          ) : (
            <p className="text-white/40 text-center py-4">No measurements recorded yet</p>
          )}
        </motion.div>

        {/* Grip Style Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="p-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm"
        >
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <MousePointer2 className="w-5 h-5 text-green-500" />
            Grip Style
          </h3>
          
          {gripData ? (
            <div className="flex items-center gap-4">
              <div className="px-6 py-3 rounded-xl bg-green-500/20 border border-green-500/30">
                <p className="text-green-500 font-medium text-lg capitalize">{gripData}</p>
              </div>
              <p className="text-white/50 text-sm">Detected grip style</p>
            </div>
          ) : (
            <p className="text-white/40 text-center py-4">No grip style detected yet</p>
          )}
        </motion.div>
      </div>
    </>
  );
}
