"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Cpu,
    Wrench,
    Gauge,
    ThermometerSun,
    AlertCircle,
    RefreshCw,
    Activity,
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
    const [selectedMachine, setSelectedMachine] = useState<MachineData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch machines from API
    const fetchMachines = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/machines`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.machines) {
                const transformedMachines = data.machines.map(transformMachineResponse);
                setMachines(transformedMachines);
            }
            setIsLoading(false);
        } catch (err) {
            console.error("Failed to fetch machines:", err);
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial fetch
        fetchMachines();

        // Set up periodic updates
        const interval = setInterval(fetchMachines, 5000);

        return () => clearInterval(interval);
    }, [fetchMachines]);

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
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                >
                                    <SpotlightCard
                                        spotlightColor={styles.spotlight}
                                        borderColor={styles.border}
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
