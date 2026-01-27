"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    AlertTriangle,
    RefreshCw,
    Activity,
    Play,
    Wifi,
    X,
    Settings,
    Square
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WorkerHealthCard, WorkerHealthCardSkeleton } from "@/components/ui/worker-health-card";
import { WorkerDetailModal } from "@/components/ui/worker-detail-modal";
import { useRealtimeWorkers } from "@/lib/realtime";
import type { WorkerVitals } from "@/types/worker";
import { cn } from "@/lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


// Transform backend response to frontend model
const transformWorkerResponse = (data: any): WorkerVitals => ({
    workerId: data.worker_id,
    heartRate: data.heart_rate || 0,
    hrv: data.hrv || 0,
    temperature: data.temperature || 36.5,
    jerkCount: data.jerk_count || 0,
    machineStressIndex: data.machine_stress_index || 0,
    vibrationRms: data.vibration_rms || 0,
    cisScore: data.cis_score || 100,
    riskState: data.risk_state || "LOW",
    breakFlag: data.break_flag || false,
    lastUpdated: data.last_updated || new Date().toISOString(),
});

/**
 * Main dashboard page with simulation mode
 */
export default function DashboardPage() {
    // We'll use local state for the list of workers to allow seamless switching between "real" API data and "simulated" API data
    // In reality both come from API now, but simulate hits a different endpoint to trigger generation
    const { workers: realWorkers, status, error, issueBreak, reconnect, isLoading: isRealLoading } = useRealtimeWorkers({
        updateInterval: 5000,
        initialWorkerCount: 6,
    });

    const [workers, setWorkers] = useState<WorkerVitals[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [simulationMode, setSimulationMode] = useState<"good" | "fair" | "poor" | null>(null);
    const [selectedWorker, setSelectedWorker] = useState<WorkerVitals | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingBreaks, setLoadingBreaks] = useState<Set<string>>(new Set());

    // Sync real workers to local state when not simulating
    useEffect(() => {
        if (!simulationMode) {
            setWorkers(realWorkers);
            setIsLoading(isRealLoading);
        }
    }, [realWorkers, isRealLoading, simulationMode]);

    // Simulation Feedback
    const [lastSentData, setLastSentData] = useState<{
        timestamp: Date;
        mode: string;
        workerCount: number;
        fullPayload?: any;
    } | null>(null);

    // ESP32 configuration
    const [esp32Url, setEsp32Url] = useState("");
    const [showEsp32Config, setShowEsp32Config] = useState(false);

    const isSimulating = !!simulationMode;
    const handleSimulate = () => setSimulationMode("good");

    // Load persisted ESP32 URL
    useEffect(() => {
        const saved = localStorage.getItem("esp32_url_workers");
        if (saved) setEsp32Url(saved);
    }, []);

    const handleEsp32UrlChange = (url: string) => {
        setEsp32Url(url);
        localStorage.setItem("esp32_url_workers", url);
    };

    // Simulation Effect
    useEffect(() => {
        if (!simulationMode) {
            setLastSentData(null);
            return; // Stop simulation if mode is null
        }

        const simulateAndRefresh = async () => {
            try {
                let url = `${API_BASE_URL}/api/workers/simulate-all?target_state=${simulationMode}`;
                if (esp32Url.trim()) {
                    url += `&esp32_url=${encodeURIComponent(esp32Url.trim())}`;
                }

                const response = await fetch(url, { method: "POST" });
                const data = await response.json();

                if (data.workers) {
                    const transformed = data.workers.map(transformWorkerResponse);
                    setWorkers(transformed);

                    if (transformed.length > 0) {
                        setLastSentData({
                            timestamp: new Date(),
                            mode: simulationMode,
                            workerCount: transformed.length,
                            fullPayload: data.last_esp32_payload
                        });
                    }
                }
            } catch (err) {
                console.error("Simulation failed:", err);
            }
        };

        simulateAndRefresh(); // Immediate call
        const interval = setInterval(simulateAndRefresh, 2500);
        return () => clearInterval(interval);
    }, [simulationMode, esp32Url]);

    const handleCardClick = (worker: WorkerVitals) => {
        setSelectedWorker(worker);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedWorker(null), 300);
    };

    const handleIssueBreak = async (workerId: string) => {
        setLoadingBreaks((prev) => new Set(prev).add(workerId));
        const success = await issueBreak(workerId);
        if (success) {
            toast.success("Break Issued", { description: `Break flag set for worker ${workerId}` });
        } else {
            toast.error("Failed to Issue Break", { description: "Please try again or contact support" });
        }
        setLoadingBreaks((prev) => {
            const next = new Set(prev);
            next.delete(workerId);
            return next;
        });
    };

    const highRiskCount = workers.filter((w) => w.riskState === "HIGH").length;
    const mediumRiskCount = workers.filter((w) => w.riskState === "MEDIUM").length;
    const lowRiskCount = workers.filter((w) => w.riskState === "LOW").length;
    const totalWorkers = workers.length;

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
                            {isSimulating ? "Running simulation mode" : "Real-time health vitals from ESP32 sensors"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {status === "error" && error && !isSimulating && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            {error}
                        </div>
                    )}
                    {/* Simulation Controls */}
                    <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/10">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSimulationMode(simulationMode === "poor" ? null : "poor")}
                            className={cn(
                                "h-8 w-8 rounded transition-all",
                                simulationMode === "poor"
                                    ? "bg-green-500/20 text-green-300 ring-1 ring-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                                    : "text-gray-400 hover:text-green-300 hover:bg-green-500/10"
                            )}
                            title="Simulate Critical Health (Green)"
                        >
                            <div className="h-3 w-3 rounded-full bg-green-500" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSimulationMode(simulationMode === "fair" ? null : "fair")}
                            className={cn(
                                "h-8 w-8 rounded transition-all",
                                simulationMode === "fair"
                                    ? "bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]"
                                    : "text-gray-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                            )}
                            title="Simulate Fair Health (Yellow)"
                        >
                            <div className="h-3 w-3 rounded-full bg-yellow-500" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSimulationMode(simulationMode === "good" ? null : "good")}
                            className={cn(
                                "h-8 w-8 rounded transition-all",
                                simulationMode === "good"
                                    ? "bg-red-500/20 text-red-300 ring-1 ring-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                                    : "text-gray-400 hover:text-red-300 hover:bg-red-500/10"
                            )}
                            title="Simulate Normal Health (Red)"
                        >
                            <div className="h-3 w-3 rounded-full bg-red-500" />
                        </Button>

                        {/* Stop Button */}
                        <div className="w-px h-4 bg-white/10 mx-1" />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSimulationMode(null)}
                            disabled={!simulationMode}
                            className={cn(
                                "h-8 w-8 rounded transition-all",
                                !simulationMode
                                    ? "text-gray-600 cursor-not-allowed opacity-50"
                                    : "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            )}
                            title="Stop Simulation"
                        >
                            <Square className="h-3 w-3 fill-current" />
                        </Button>
                    </div>

                    {/* ESP32 Configuration */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowEsp32Config(!showEsp32Config)}
                            className={cn(
                                "transition-all duration-300",
                                esp32Url.trim()
                                    ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-300"
                                    : "border-white/20 text-gray-400 hover:bg-white/10"
                            )}
                            title={esp32Url.trim() ? `ESP32: ${esp32Url}` : "Configure ESP32"}
                        >
                            <Wifi className="h-4 w-4" />
                        </Button>

                        {showEsp32Config && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10">
                                <input
                                    type="text"
                                    placeholder="http://192.168.x.x/data"
                                    value={esp32Url}
                                    onChange={(e) => handleEsp32UrlChange(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm text-white placeholder:text-gray-500 w-48"
                                />
                                {esp32Url && (
                                    <button
                                        onClick={() => handleEsp32UrlChange("")}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
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
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-white/10 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Active</p>
                            <p className="text-3xl font-bold text-white mt-1">{totalWorkers}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5">
                            <Users className="h-6 w-6 text-gray-400" />
                        </div>
                    </div>
                    {isSimulating && <div className="absolute top-2 right-2"><Activity className="h-3 w-3 text-purple-400 animate-pulse" /></div>}
                </div>
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-900/30 to-red-950/30 border border-red-500/20 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-red-400/80 uppercase tracking-wider">High Risk</p>
                            <p className="text-3xl font-bold text-red-400 mt-1">{highRiskCount}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                            <AlertTriangle className="h-6 w-6 text-red-400" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500/30">
                        <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${totalWorkers > 0 ? (highRiskCount / totalWorkers) * 100 : 0}%` }} />
                    </div>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-900/20 to-yellow-950/20 border border-yellow-500/20 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-yellow-400/80 uppercase tracking-wider">Medium Risk</p>
                            <p className="text-3xl font-bold text-yellow-400 mt-1">{mediumRiskCount}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
                            <Activity className="h-6 w-6 text-yellow-400" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-500/30">
                        <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${totalWorkers > 0 ? (mediumRiskCount / totalWorkers) * 100 : 0}%` }} />
                    </div>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-900/20 to-green-950/20 border border-green-500/20 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-green-400/80 uppercase tracking-wider">Low Risk</p>
                            <p className="text-3xl font-bold text-green-400 mt-1">{lowRiskCount}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                            <Activity className="h-6 w-6 text-green-400" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500/30">
                        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${totalWorkers > 0 ? (lowRiskCount / totalWorkers) * 100 : 0}%` }} />
                    </div>
                </div>
            </div>

            {lastSentData && simulationMode && (
                <div className="flex items-center gap-4 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                        <span className="text-sm font-medium text-indigo-300">
                            {simulationMode === "good" ? "Normal" : simulationMode === "fair" ? "Warning" : "Critical"} Mode
                        </span>
                    </div>

                    <div className="h-4 w-px bg-indigo-500/20" />

                    <div className="text-xs text-gray-400 font-mono">
                        Workers: {lastSentData.workerCount}
                    </div>

                    <div className="h-4 w-px bg-indigo-500/20" />

                    {esp32Url ? (
                        <div className="flex items-center gap-2 text-xs text-green-400">
                            <Wifi className="h-3 w-3" />
                            <span>Connected</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Wifi className="h-3 w-3" />
                            <span>No ESP32 URL</span>
                        </div>
                    )}

                    {lastSentData.fullPayload && (
                        <div className="ml-auto">
                            <details className="relative group">
                                <summary className="list-none cursor-pointer flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 px-2 py-1 rounded">
                                    <span className="font-mono">JSON</span>
                                </summary>
                                <div className="absolute top-8 right-0 w-[400px] max-h-[300px] overflow-auto bg-gray-900 border border-white/10 rounded-lg p-3 shadow-xl z-50">
                                    <pre className="text-[10px] text-gray-300 font-mono whitespace-pre-wrap">
                                        {JSON.stringify(lastSentData.fullPayload, null, 2)}
                                    </pre>
                                </div>
                            </details>
                        </div>
                    )}
                </div>
            )}

            {/* Worker Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {isLoading && !isSimulating ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <motion.div key={`skeleton-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <WorkerHealthCardSkeleton />
                            </motion.div>
                        ))
                    ) : (
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

            {!isLoading && workers.length === 0 && !isSimulating && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="h-12 w-12 text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-white">No Workers Connected</h3>
                    <p className="text-sm text-gray-400 mt-1 mb-4">Waiting for sensor data from ESP32 devices</p>
                    <Button variant="outline" onClick={handleSimulate} className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                        <Play className="h-4 w-4 mr-2" />Simulate Data
                    </Button>
                </div>
            )}

            <WorkerDetailModal worker={selectedWorker} isOpen={isModalOpen} onClose={handleCloseModal} onIssueBreak={handleIssueBreak} />
        </div>
    );
}
