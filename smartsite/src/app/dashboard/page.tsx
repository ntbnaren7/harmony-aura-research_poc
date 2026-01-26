"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WorkerHealthCard, WorkerHealthCardSkeleton } from "@/components/ui/worker-health-card";
import { WorkerDetailModal } from "@/components/ui/worker-detail-modal";
import { useRealtimeWorkers } from "@/lib/realtime";
import type { WorkerVitals } from "@/types/worker";

/**
 * Main dashboard page displaying worker health cards
 * Click on any card to view detailed charts and historical data
 */
export default function DashboardPage() {
    const { workers, status, error, issueBreak, reconnect, isLoading } = useRealtimeWorkers({
        updateInterval: 5000,
        initialWorkerCount: 12,
    });
    const [loadingBreaks, setLoadingBreaks] = useState<Set<string>>(new Set());
    const [selectedWorker, setSelectedWorker] = useState<WorkerVitals | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleCardClick = (worker: WorkerVitals) => {
        setSelectedWorker(worker);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedWorker(null), 300); // Clear after animation
    };

    const handleIssueBreak = async (workerId: string) => {
        setLoadingBreaks((prev) => new Set(prev).add(workerId));

        const success = await issueBreak(workerId);

        if (success) {
            toast.success("Break Issued", {
                description: `Break flag set for worker ${workerId}`,
            });
        } else {
            toast.error("Failed to Issue Break", {
                description: "Please try again or contact support",
            });
        }

        setLoadingBreaks((prev) => {
            const next = new Set(prev);
            next.delete(workerId);
            return next;
        });
    };

    // Count by risk state
    const highRiskCount = workers.filter((w) => w.riskState === "HIGH").length;
    const mediumRiskCount = workers.filter((w) => w.riskState === "MEDIUM").length;
    const lowRiskCount = workers.filter((w) => w.riskState === "LOW").length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 border border-white/20">
                        <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Worker Monitoring</h1>
                        <p className="text-sm text-gray-400">
                            Real-time health vitals from ESP32 sensors
                        </p>
                    </div>
                </div>

                {/* Status and Refresh */}
                <div className="flex items-center gap-3">
                    {status === "error" && error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            {error}
                        </div>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={reconnect}
                        disabled={status === "connecting"}
                        className="border-white/20 text-white hover:bg-white/10"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${status === "connecting" ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Risk Summary */}
            {workers.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-sm font-medium text-red-400">{highRiskCount} High Risk</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        <span className="text-sm font-medium text-yellow-400">{mediumRiskCount} Medium Risk</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20">
                        <div className="h-2 w-2 rounded-full bg-white" />
                        <span className="text-sm font-medium text-gray-300">{lowRiskCount} Low Risk</span>
                    </div>
                </div>
            )}

            {/* Worker Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        // Skeleton loaders
                        Array.from({ length: 6 }).map((_, i) => (
                            <motion.div
                                key={`skeleton-${i}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <WorkerHealthCardSkeleton />
                            </motion.div>
                        ))
                    ) : (
                        // Actual worker cards - now clickable!
                        workers.map((worker, index) => (
                            <motion.div
                                key={worker.workerId}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <WorkerHealthCard
                                    worker={worker}
                                    onIssueBreak={handleIssueBreak}
                                    onClick={handleCardClick}
                                    isBreakLoading={loadingBreaks.has(worker.workerId)}
                                />
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Empty state */}
            {!isLoading && workers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="h-12 w-12 text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-white">No Workers Connected</h3>
                    <p className="text-sm text-gray-400 mt-1">
                        Waiting for sensor data from ESP32 devices
                    </p>
                </div>
            )}

            {/* Worker Detail Modal */}
            <WorkerDetailModal
                worker={selectedWorker}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onIssueBreak={handleIssueBreak}
            />
        </div>
    );
}
