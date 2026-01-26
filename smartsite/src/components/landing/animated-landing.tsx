"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, ArrowRight, Sparkles, Activity, Cpu, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Animated landing page for SmartSite
 * Features gradient background, floating particles, and animated stats
 */
export function AnimatedLanding() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setMousePosition({
                    x: (e.clientX - rect.left) / rect.width,
                    y: (e.clientY - rect.top) / rect.height,
                });
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return (
        <div
            ref={containerRef}
            className="relative min-h-screen overflow-hidden bg-slate-950"
        >
            {/* Animated gradient background */}
            <div
                className="absolute inset-0 transition-all duration-500"
                style={{
                    background: `
            radial-gradient(600px circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, rgba(16, 185, 129, 0.15), transparent 40%),
            radial-gradient(800px circle at 80% 60%, rgba(6, 182, 212, 0.1), transparent 50%),
            radial-gradient(600px circle at 20% 80%, rgba(99, 102, 241, 0.1), transparent 40%)
          `,
                }}
            />

            {/* Grid overlay */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
                    backgroundSize: "60px 60px",
                }}
            />

            {/* Floating orbs */}
            <motion.div
                className="absolute h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"
                animate={{
                    x: [0, 100, 0],
                    y: [0, 50, 0],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                style={{ top: "20%", left: "10%" }}
            />
            <motion.div
                className="absolute h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"
                animate={{
                    x: [0, -80, 0],
                    y: [0, 100, 0],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                style={{ bottom: "10%", right: "10%" }}
            />

            {/* Main content */}
            <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="mb-8"
                >
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/25">
                        <Shield className="h-10 w-10 text-white" />
                    </div>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mb-4 text-center text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl"
                >
                    <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                        SmartSite
                    </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="mb-8 max-w-xl text-center text-lg text-slate-400 sm:text-xl"
                >
                    AI-Powered Construction Safety & Predictive Maintenance
                </motion.p>

                {/* CTA Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                >
                    <Link href="/login">
                        <Button
                            size="lg"
                            className="group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-6 text-lg font-semibold text-white transition-all hover:shadow-lg hover:shadow-emerald-500/25"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Enter Dashboard
                                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </span>
                        </Button>
                    </Link>
                </motion.div>

                {/* Stats cards */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3"
                >
                    <StatCard
                        icon={<Users className="h-5 w-5 text-emerald-400" />}
                        label="Real-time Monitoring"
                        value="Worker Safety"
                    />
                    <StatCard
                        icon={<Cpu className="h-5 w-5 text-cyan-400" />}
                        label="Predictive Analytics"
                        value="Machine Health"
                    />
                    <StatCard
                        icon={<Activity className="h-5 w-5 text-blue-400" />}
                        label="IoT Integration"
                        value="ESP32 Sensors"
                    />
                </motion.div>

                {/* Sparkle decoration */}
                <motion.div
                    className="absolute top-1/4 right-1/4"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                >
                    <Sparkles className="h-6 w-6 text-emerald-500/40" />
                </motion.div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 left-0 right-0 text-center text-sm text-slate-500">
                Powered by Harmony-Aura OS
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
                {icon}
            </div>
            <div>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="font-medium text-white">{value}</p>
            </div>
        </div>
    );
}
