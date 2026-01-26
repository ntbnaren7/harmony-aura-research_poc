"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    Cpu,
    Cloud,
    Menu,
    X,
    LogOut,
    Shield,
    Wifi,
    WifiOff,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardBackground } from "@/components/ui/dashboard-background";
import { useAuth } from "@/lib/auth";
import type { DashboardStats, SystemStatus } from "@/types/worker";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
    children: ReactNode;
    stats?: DashboardStats;
}

const navItems = [
    { href: "/dashboard", label: "Workers", icon: Users },
    { href: "/dashboard/machines", label: "Machines", icon: Cpu },
    { href: "/dashboard/environment", label: "Environment", icon: Cloud },
];

function getStatusConfig(status: SystemStatus) {
    switch (status) {
        case "ONLINE":
            return {
                icon: Wifi,
                label: "System Online",
                color: "text-white",
                bgColor: "bg-white/10",
                borderColor: "border-white/20",
            };
        case "DEGRADED":
            return {
                icon: AlertCircle,
                label: "Degraded",
                color: "text-yellow-400",
                bgColor: "bg-yellow-500/20",
                borderColor: "border-yellow-500/30",
            };
        case "OFFLINE":
            return {
                icon: WifiOff,
                label: "Offline",
                color: "text-red-400",
                bgColor: "bg-red-500/20",
                borderColor: "border-red-500/30",
            };
    }
}

/**
 * Dashboard layout with sidebar and top bar
 * Harmony Aura OS - Monochrome Dark Theme
 */
export function DashboardLayout({ children, stats }: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const statusConfig = stats ? getStatusConfig(stats.systemStatus) : null;
    const StatusIcon = statusConfig?.icon ?? Wifi;

    return (
        <div className="min-h-screen bg-black relative">
            {/* Animated Shader Background */}
            <DashboardBackground speed={0.2} />

            {/* Top Bar */}
            <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/10 bg-black/80 backdrop-blur-md">
                <div className="flex h-full items-center justify-between px-4 lg:px-6">
                    {/* Left: Logo and Mobile Menu */}
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden text-gray-400 hover:text-white"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        >
                            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>

                        <Link href="/dashboard" className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-700">
                                <Shield className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white hidden sm:inline">Harmony Aura</span>
                        </Link>
                    </div>

                    {/* Center: System Status */}
                    {statusConfig && (
                        <div
                            className={cn(
                                "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border",
                                statusConfig.bgColor,
                                statusConfig.borderColor
                            )}
                        >
                            <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
                            <span className={cn("text-sm font-medium", statusConfig.color)}>
                                {statusConfig.label}
                            </span>
                        </div>
                    )}

                    {/* Right: Stats and User */}
                    <div className="flex items-center gap-4">
                        {stats && (
                            <div className="hidden sm:flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Active Workers</p>
                                    <p className="text-lg font-bold text-white">{stats.totalActiveWorkers}</p>
                                </div>
                                <div className="flex gap-1">
                                    <Badge variant="destructive" className="text-xs">
                                        {stats.highRiskCount} High
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs bg-gray-800 text-gray-300">
                                        {stats.mediumRiskCount} Med
                                    </Badge>
                                </div>
                            </div>
                        )}

                        {user && (
                            <div className="flex items-center gap-2">
                                <div className="hidden lg:block text-right">
                                    <p className="text-xs text-gray-500">Supervisor</p>
                                    <p className="text-sm text-white truncate max-w-[120px]">{user.email}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={logout}
                                    className="text-gray-500 hover:text-white"
                                >
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-16 bottom-0 z-40 w-64 border-r border-white/10 bg-black/95 backdrop-blur-sm transition-transform duration-300 lg:translate-x-0",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <nav className="flex flex-col gap-1 p-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsSidebarOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-white/10 text-white border border-white/20"
                                        : "text-gray-500 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <Icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                    <p className="text-xs text-gray-600 text-center">Powered by OverClocked</p>
                </div>
            </aside>

            {/* Sidebar Overlay (mobile) */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="pt-16 lg:pl-64 bg-black min-h-screen">
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
