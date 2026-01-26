"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { generateDashboardStats } from "@/lib/mock-data";
import { useRealtimeWorkers } from "@/lib/realtime";

/**
 * Dashboard layout wrapper with auth protection
 */
export default function DashboardLayoutWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { workers } = useRealtimeWorkers();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    // Don't render until auth is checked
    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-white text-lg">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    const stats = workers.length > 0 ? generateDashboardStats(workers) : undefined;

    return <DashboardLayout stats={stats}>{children}</DashboardLayout>;
}
