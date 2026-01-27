"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Cpu,
    Wrench,
    Gauge,
    ThermometerSun,
    AlertCircle,
    RefreshCw,
    Activity,
    Play,
    Settings,
    Wifi,
    X,
    Square,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { MachineDetailModal } from "@/components/ui/machine-detail-modal";
import type { MachineData, MachineStatus } from "@/types/worker";
import { cn } from "@/lib/utils";

// FastAPI backend URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Transform API response to MachineData format
 */
function transformMachineResponse(apiMachine: {
    machine_id: string;
    name: string;
    type: string;
    status: string | null;
    stress_index: number | null;
    temperature: number | null;
    vibration_rms: number | null;
    operating_hours: number | null;
    fuel_level: number | null;
    oil_pressure: number | null;
    failure_probability: number | null;
    health_score: number | null;
    predicted_maintenance_days: number | null;
    last_updated: string | null;
}): MachineData {
    return {
        machineId: apiMachine.machine_id,
        name: apiMachine.name,
        type: apiMachine.type as MachineData["type"],
        status: (apiMachine.status as MachineStatus) ?? "OFFLINE",
        stressIndex: apiMachine.stress_index ?? 0,
        temperature: apiMachine.temperature ?? 0,
        vibrationRms: apiMachine.vibration_rms ?? 0,
        operatingHours: apiMachine.operating_hours ?? 0,
        daysSinceService: 0, // Not in API yet
        fuelLevel: apiMachine.fuel_level ?? 0,
        oilPressure: apiMachine.oil_pressure ?? 0,
        failureProbability: apiMachine.failure_probability ?? 0,
        predictedMaintenanceDays: apiMachine.predicted_maintenance_days ?? 30,
        healthScore: apiMachine.health_score ?? 100,
        lastUpdated: apiMachine.last_updated ?? new Date().toISOString(),
    };
}

function getStatusStyles(status: MachineStatus) {
    switch (status) {
        case "OPERATIONAL":
            return {
                bg: "bg-green-900/20",
                border: "border-green-500/30",
                text: "text-green-400",
                spotlight: "rgba(34, 197, 94, 0.2)",
            };
        case "WARNING":
            return {
                bg: "bg-yellow-900/20",
                border: "border-yellow-500/30",
                text: "text-yellow-400",
                spotlight: "rgba(234, 179, 8, 0.2)",
            };
        case "MAINTENANCE":
            return {
                bg: "bg-red-900/20",
                border: "border-red-500/30",
                text: "text-red-400",
                spotlight: "rgba(239, 68, 68, 0.25)",
            };
        case "OFFLINE":
            return {
                bg: "bg-gray-900/20",
                border: "border-gray-500/30",
                text: "text-gray-400",
                spotlight: "rgba(107, 114, 128, 0.2)",
            };
    }
}

/**
 * Machines monitoring page with predictive maintenance
 * Click on any card to view detailed analytics and predictions
 */
export default function MachinesPage() {
    const [machines, setMachines] = useState<MachineData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSimulating, setIsSimulating] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [simulationMode, setSimulationMode] = useState<"good" | "fair" | "poor" | null>(null);
    const [changedMachines, setChangedMachines] = useState<Set<string>>(new Set());
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [selectedMachine, setSelectedMachine] = useState<MachineData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // ESP32 configuration
    // ESP32 configuration
    const [esp32Url, setEsp32Url] = useState("");
    const [showEsp32Config, setShowEsp32Config] = useState(false);
    const [lastSentData, setLastSentData] = useState<{
        timestamp: Date;
        mode: string;
        vibration: number;
        temperature: number;
        machineCount: number;
        fullPayload?: any;
    } | null>(null);

    // Persist ESP32 URL
    useEffect(() => {
        const saved = localStorage.getItem("esp32_url");
        if (saved) setEsp32Url(saved);
    }, []);

    const handleEsp32UrlChange = (url: string) => {
        setEsp32Url(url);
        localStorage.setItem("esp32_url", url);
    };

    // Store previous machines for change detection
    const prevMachinesRef = useRef<MachineData[]>([]);

    // Fetch machines from API
    const fetchMachines = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/machines`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.machines) {
                const transformedMachines = data.machines.map(transformMachineResponse);

                // Detect which machines have changed values
                const changed = new Set<string>();
                transformedMachines.forEach((machine: MachineData) => {
                    const prev = prevMachinesRef.current.find(m => m.machineId === machine.machineId);
                    if (prev && (
                        prev.healthScore !== machine.healthScore ||
                        prev.temperature !== machine.temperature ||
                        prev.failureProbability !== machine.failureProbability ||
                        prev.status !== machine.status
                    )) {
                        changed.add(machine.machineId);
                    }
                });

                if (changed.size > 0) {
                    setChangedMachines(changed);
                    // Clear highlights after animation completes
                    setTimeout(() => setChangedMachines(new Set()), 1500);
                }

                prevMachinesRef.current = transformedMachines;
                setMachines(transformedMachines);
            }
            setLastUpdated(new Date());
            setIsLoading(false);
        } catch (err) {
            console.error("Failed to fetch machines:", err);
            setIsLoading(false);
        } finally {
            // Brief delay to show refresh animation
            setTimeout(() => setIsRefreshing(false), 300);
        }
    }, []);

    useEffect(() => {
        // Initial fetch
        fetchMachines();

        // Set up periodic updates (every 2.5 seconds)
        const interval = setInterval(fetchMachines, 2500);

        return () => clearInterval(interval);
    }, [fetchMachines]);

    useEffect(() => {
        if (!simulationMode) {
            setLastSentData(null);
            return;
        }

        const simulateAndRefresh = async () => {
            try {
                // Build URL with optional ESP32 parameter and target state
                let url = `${API_BASE_URL}/api/machines/simulate-all?target_state=${simulationMode}`;
                if (esp32Url.trim()) {
                    url += `&esp32_url=${encodeURIComponent(esp32Url.trim())}`;
                }

                const response = await fetch(url, {
                    method: "POST",
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.machines) {
                        const transformed = data.machines.map(transformMachineResponse);
                        setMachines(transformed);

                        // Update visual status
                        if (transformed.length > 0) {
                            const sample = transformed[0];
                            setLastSentData({
                                timestamp: new Date(),
                                mode: simulationMode,
                                vibration: sample.vibrationRms,
                                temperature: sample.temperature,
                                machineCount: transformed.length,
                                fullPayload: data.last_esp32_payload
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Auto-simulation failed:", err);
            }
        };

        // Simulate immediately when enabled/changed
        simulateAndRefresh();

        // Then simulate every 2.5 seconds
        const interval = setInterval(simulateAndRefresh, 2500);

        return () => clearInterval(interval);
    }, [simulationMode, esp32Url]);

    const handleCardClick = (machine: MachineData) => {
        setSelectedMachine(machine);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedMachine(null), 300);
    };

    const handleScheduleMaintenance = (machineId: string) => {
        toast.success("Maintenance Scheduled", {
            description: `Maintenance request created for ${machineId}`,
        });
        handleCloseModal();
    };

    const handleRefresh = () => {
        setIsLoading(true);
        fetchMachines().then(() => {
            toast.success("Data Refreshed", { description: "Machine data updated" });
        });
    };


    const handleSimulate = async () => {
        setIsSimulating(true);
        try {
            // Build URL with optional ESP32 parameter
            let url = `${API_BASE_URL}/api/machines/simulate-all`;
            if (esp32Url.trim()) {
                url += `?esp32_url=${encodeURIComponent(esp32Url.trim())}`;
            }

            const response = await fetch(url, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.machines) {
                const transformedMachines = data.machines.map(transformMachineResponse);
                setMachines(transformedMachines);
            }

            const esp32Message = esp32Url.trim() ? " (sent to ESP32)" : "";
            toast.success("Simulation Complete", {
                description: `Generated telemetry for ${data.total} machines${esp32Message}`,
            });
        } catch (err) {
            console.error("Simulation failed:", err);
            toast.error("Simulation Failed", {
                description: "Could not generate simulated data",
            });
        } finally {
            setIsSimulating(false);
        }
    };

    // Count by status
    const operationalCount = machines.filter(m => m.status === "OPERATIONAL").length;
    const warningCount = machines.filter(m => m.status === "WARNING").length;
    const maintenanceCount = machines.filter(m => m.status === "MAINTENANCE").length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 border border-white/20">
                        <Cpu className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Machine Monitoring</h1>
                        <p className="text-sm text-gray-400">
                            Predictive maintenance and equipment health
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Live indicator */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className={cn(
                            "h-2 w-2 rounded-full bg-green-500",
                            isRefreshing ? "animate-ping" : "animate-pulse"
                        )} />
                        <span className="text-xs font-medium text-green-400">LIVE</span>
                    </div>

                    {/* Simulation Controls - 3 colored buttons */}
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSimulationMode(simulationMode === "good" ? null : "good")}
                            className={cn(
                                "h-8 w-8 rounded transition-all",
                                simulationMode === "good"
                                    ? "bg-green-500/20 text-green-300 ring-1 ring-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                                    : "text-gray-400 hover:text-green-300 hover:bg-green-500/10"
                            )}
                            title="Simulate Good Health (Green)"
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
                            title="Simulate Mediocre Health (Yellow)"
                        >
                            <div className="h-3 w-3 rounded-full bg-yellow-500" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSimulationMode(simulationMode === "poor" ? null : "poor")}
                            className={cn(
                                "h-8 w-8 rounded transition-all",
                                simulationMode === "poor"
                                    ? "bg-red-500/20 text-red-300 ring-1 ring-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                                    : "text-gray-400 hover:text-red-300 hover:bg-red-500/10"
                            )}
                            title="Simulate Poor Health (Red)"
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
                            onClick={handleSimulate}
                            disabled={isSimulating || isLoading || !!simulationMode}
                            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50"
                        >
                            <Play className={cn("h-4 w-4 mr-2", isSimulating && "animate-pulse")} />
                            {isSimulating ? "Simulating..." : "Manual"}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="border-white/20 text-white hover:bg-white/10"
                        >
                            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            {/* Simulation Feedback Display */}
            {lastSentData && simulationMode && (
                <div className="flex items-center gap-4 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-400 animate-pulse" />
                        <span className="text-sm text-indigo-300 font-medium">
                            Sending {lastSentData.mode.toUpperCase()} profile to ESP32...
                        </span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="text-xs text-gray-400 font-mono">
                        Vib: <span className="text-white">{lastSentData.vibration.toFixed(2)}</span> |
                        Temp: <span className="text-white">{lastSentData.temperature.toFixed(1)}°C</span> |
                        Machines: {lastSentData.machineCount}
                    </div>
                    {esp32Url && (
                        <>
                            <div className="h-4 w-px bg-white/10" />
                            <div className="flex items-center gap-1 text-xs text-green-400">
                                <Wifi className="h-3 w-3" />
                                <span>Connected</span>
                            </div>
                        </>
                    )}
                    {!esp32Url && (
                        <>
                            <div className="h-4 w-px bg-white/10" />
                            <div className="flex items-center gap-1 text-xs text-yellow-400">
                                <AlertCircle className="h-3 w-3" />
                                <span>No ESP32 URL set</span>
                            </div>
                        </>
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

            {/* Status Summary */}
            {machines.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium text-green-400">{operationalCount} Operational</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        <span className="text-sm font-medium text-yellow-400">{warningCount} Warning</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-sm font-medium text-red-400">{maintenanceCount} Needs Maintenance</span>
                    </div>
                </div>
            )}

            {/* Machine Grid */}
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
                                className="rounded-xl border border-white/10 bg-white/5 p-5 animate-pulse"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-10 w-10 rounded-lg bg-white/10" />
                                        <div className="h-5 w-24 bg-white/10 rounded" />
                                    </div>
                                    <div className="h-6 w-20 bg-white/10 rounded-full" />
                                </div>
                                <div className="space-y-3">
                                    <div className="h-4 w-full bg-white/10 rounded" />
                                    <div className="h-4 w-3/4 bg-white/10 rounded" />
                                    <div className="h-4 w-1/2 bg-white/10 rounded" />
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        // Actual machine cards
                        machines.map((machine, index) => {
                            const styles = getStatusStyles(machine.status);
                            return (
                                <motion.div
                                    key={machine.machineId}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{
                                        opacity: 1,
                                        scale: 1,
                                        boxShadow: changedMachines.has(machine.machineId)
                                            ? "0 0 30px rgba(34, 211, 238, 0.6), 0 0 60px rgba(34, 211, 238, 0.3)"
                                            : "none"
                                    }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{
                                        duration: 0.3,
                                        delay: index * 0.05,
                                        boxShadow: { duration: 0.5 }
                                    }}
                                    className={cn(
                                        "rounded-xl overflow-hidden",
                                        changedMachines.has(machine.machineId) && "ring-2 ring-cyan-400/50"
                                    )}
                                >
                                    <SpotlightCard
                                        spotlightColor={styles.spotlight}
                                        borderColor={changedMachines.has(machine.machineId) ? "rgba(34, 211, 238, 0.5)" : styles.border}
                                        backgroundColor={styles.bg}
                                        className="w-full cursor-pointer"
                                        onClick={() => handleCardClick(machine)}
                                    >
                                        <div className="p-5">
                                            {/* Header */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/30">
                                                        <Cpu className={cn("h-5 w-5", styles.text)} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase tracking-wider">{machine.type}</p>
                                                        <p className="font-bold text-white">{machine.name}</p>
                                                    </div>
                                                </div>
                                                <Badge className={cn("text-xs", styles.bg, styles.text)}>
                                                    {machine.status}
                                                </Badge>
                                            </div>

                                            {/* Metrics */}
                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Gauge className="h-4 w-4 text-gray-500" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Health</p>
                                                        <p className={cn(
                                                            "text-lg font-semibold",
                                                            machine.healthScore > 70 ? "text-green-400" :
                                                                machine.healthScore > 40 ? "text-yellow-400" : "text-red-400"
                                                        )}>
                                                            {machine.healthScore}%
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4 text-gray-500" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Failure Risk</p>
                                                        <p className={cn(
                                                            "text-lg font-semibold",
                                                            machine.failureProbability < 30 ? "text-green-400" :
                                                                machine.failureProbability < 60 ? "text-yellow-400" : "text-red-400"
                                                        )}>
                                                            {machine.failureProbability}%
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Secondary metrics */}
                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="flex items-center gap-2 text-gray-500">
                                                        <ThermometerSun className="h-4 w-4" />
                                                        Temperature
                                                    </span>
                                                    <span className="text-white">{machine.temperature.toFixed(1)}°C</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="flex items-center gap-2 text-gray-500">
                                                        <Activity className="h-4 w-4" />
                                                        Vibration
                                                    </span>
                                                    <span className="text-white">{machine.vibrationRms.toFixed(2)} RMS</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="flex items-center gap-2 text-gray-500">
                                                        <Wrench className="h-4 w-4" />
                                                        Next Service
                                                    </span>
                                                    <span className={cn(
                                                        machine.predictedMaintenanceDays < 7 ? "text-red-400" :
                                                            machine.predictedMaintenanceDays < 14 ? "text-yellow-400" : "text-white"
                                                    )}>
                                                        ~{machine.predictedMaintenanceDays} days
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Health bar */}
                                            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-500",
                                                        machine.healthScore > 70 ? "bg-green-500" :
                                                            machine.healthScore > 40 ? "bg-yellow-500" : "bg-red-500"
                                                    )}
                                                    style={{ width: `${machine.healthScore}%` }}
                                                />
                                            </div>
                                        </div>
                                    </SpotlightCard>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            {/* Machine Detail Modal */}
            <MachineDetailModal
                machine={selectedMachine}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onScheduleMaintenance={handleScheduleMaintenance}
            />
        </div>
    );
}
