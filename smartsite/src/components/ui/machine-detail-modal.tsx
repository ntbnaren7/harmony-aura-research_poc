"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Cpu,
    Thermometer,
    Gauge,
    Activity,
    Clock,
    TrendingUp,
    TrendingDown,
    Wrench,
    AlertTriangle,
    Fuel,
    Timer,
    Zap,
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    RadialBarChart,
    RadialBar,
    Legend,
    ComposedChart,
} from "recharts";
import type { MachineData } from "@/types/worker";
import { cn } from "@/lib/utils";

interface MachineDetailModalProps {
    machine: MachineData | null;
    isOpen: boolean;
    onClose: () => void;
    onScheduleMaintenance: (machineId: string) => void;
}

// Generate predictive maintenance data
function generatePredictiveData(machine: MachineData) {
    const data = [];
    const now = Date.now();
    const daysAhead = 30;

    for (let i = 0; i <= daysAhead; i++) {
        const date = new Date(now + i * 24 * 60 * 60 * 1000);
        const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        // Simulate degradation curve
        const degradation = Math.min(100, machine.failureProbability + (i * 2) + Math.sin(i * 0.5) * 5);
        const healthProjection = Math.max(0, machine.healthScore - (i * 1.5) - Math.random() * 5);

        data.push({
            date: dateLabel,
            failureProbability: Math.max(0, Math.min(100, degradation)),
            healthScore: Math.max(0, Math.min(100, healthProjection)),
            threshold: 70, // Maintenance threshold
        });
    }
    return data;
}

// Generate historical performance data
function generatePerformanceHistory(machine: MachineData) {
    const data = [];
    const now = Date.now();

    for (let i = 24; i >= 0; i--) {
        const time = new Date(now - i * 60 * 60 * 1000);
        const timeLabel = time.toLocaleTimeString("en-US", { hour: "2-digit" });

        data.push({
            time: timeLabel,
            temperature: machine.temperature + (Math.sin(i * 0.3) * 8) + (Math.random() - 0.5) * 5,
            vibration: machine.vibrationRms + (Math.cos(i * 0.4) * 0.5) + (Math.random() - 0.5) * 0.3,
            stress: machine.stressIndex + (Math.sin(i * 0.5) * 15) + (Math.random() - 0.5) * 10,
            oilPressure: machine.oilPressure + (Math.random() - 0.5) * 10,
        });
    }
    return data;
}

// Generate maintenance schedule data
function generateMaintenanceSchedule(machine: MachineData) {
    return [
        { task: "Oil Change", daysUntil: Math.max(1, machine.predictedMaintenanceDays - 5), priority: "medium" },
        { task: "Filter Replacement", daysUntil: Math.max(1, machine.predictedMaintenanceDays), priority: machine.failureProbability > 50 ? "high" : "medium" },
        { task: "Bearing Inspection", daysUntil: Math.max(1, machine.predictedMaintenanceDays + 7), priority: "low" },
        { task: "Full Service", daysUntil: Math.max(1, machine.predictedMaintenanceDays + 14), priority: machine.healthScore < 50 ? "high" : "low" },
    ];
}

function getStatusStyles(status: MachineData["status"]) {
    switch (status) {
        case "OPERATIONAL":
            return { bg: "bg-green-500/20", border: "border-green-500/30", text: "text-green-400" };
        case "WARNING":
            return { bg: "bg-yellow-500/20", border: "border-yellow-500/30", text: "text-yellow-400" };
        case "MAINTENANCE":
            return { bg: "bg-red-500/20", border: "border-red-500/30", text: "text-red-400" };
        case "OFFLINE":
            return { bg: "bg-gray-500/20", border: "border-gray-500/30", text: "text-gray-400" };
    }
}

export function MachineDetailModal({
    machine,
    isOpen,
    onClose,
    onScheduleMaintenance,
}: MachineDetailModalProps) {
    const [activeTab, setActiveTab] = useState<"realtime" | "predictive" | "maintenance">("realtime");

    const predictiveData = useMemo(() => machine ? generatePredictiveData(machine) : [], [machine]);
    const performanceHistory = useMemo(() => machine ? generatePerformanceHistory(machine) : [], [machine]);
    const maintenanceSchedule = useMemo(() => machine ? generateMaintenanceSchedule(machine) : [], [machine]);

    if (!machine) return null;

    const statusStyles = getStatusStyles(machine.status);

    const metrics = [
        { label: "Temperature", value: `${machine.temperature.toFixed(1)}°C`, icon: Thermometer, color: "#f97316", status: machine.temperature > 75 ? "warning" : "normal" },
        { label: "Vibration", value: `${machine.vibrationRms.toFixed(2)} RMS`, icon: Activity, color: "#8b5cf6", status: machine.vibrationRms > 2 ? "warning" : "normal" },
        { label: "Stress", value: `${machine.stressIndex}%`, icon: Gauge, color: "#ef4444", status: machine.stressIndex > 70 ? "warning" : "normal" },
        { label: "Oil Pressure", value: `${machine.oilPressure} PSI`, icon: Zap, color: "#3b82f6", status: machine.oilPressure < 30 ? "warning" : "normal" },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl bg-black/95 border-white/10 backdrop-blur-xl text-white p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-white/10 sticky top-0 bg-black/95 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center", statusStyles.bg, statusStyles.border, "border")}>
                                <Cpu className={cn("h-7 w-7", statusStyles.text)} />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold text-white">
                                    {machine.name}
                                </DialogTitle>
                                <p className="text-gray-400 text-sm mt-1">
                                    {machine.type} • ID: {machine.machineId}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge className={cn("text-sm px-3 py-1", statusStyles.bg, statusStyles.text)}>
                                {machine.status}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Health Score & Failure Probability */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={cn(
                            "p-4 rounded-xl border",
                            machine.healthScore > 70 ? "bg-green-500/10 border-green-500/30" :
                                machine.healthScore > 40 ? "bg-yellow-500/10 border-yellow-500/30" :
                                    "bg-red-500/10 border-red-500/30"
                        )}>
                            <p className="text-sm text-gray-400">Health Score</p>
                            <div className="flex items-end gap-2">
                                <p className={cn(
                                    "text-4xl font-bold",
                                    machine.healthScore > 70 ? "text-green-400" :
                                        machine.healthScore > 40 ? "text-yellow-400" : "text-red-400"
                                )}>
                                    {machine.healthScore}
                                </p>
                                <span className="text-gray-500 mb-1">/100</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-white/10 mt-2 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${machine.healthScore}%` }}
                                    transition={{ duration: 1 }}
                                    className={cn(
                                        "h-full rounded-full",
                                        machine.healthScore > 70 ? "bg-green-500" :
                                            machine.healthScore > 40 ? "bg-yellow-500" : "bg-red-500"
                                    )}
                                />
                            </div>
                        </div>

                        <div className={cn(
                            "p-4 rounded-xl border",
                            machine.failureProbability < 30 ? "bg-green-500/10 border-green-500/30" :
                                machine.failureProbability < 60 ? "bg-yellow-500/10 border-yellow-500/30" :
                                    "bg-red-500/10 border-red-500/30"
                        )}>
                            <p className="text-sm text-gray-400">Failure Probability</p>
                            <div className="flex items-end gap-2">
                                <p className={cn(
                                    "text-4xl font-bold",
                                    machine.failureProbability < 30 ? "text-green-400" :
                                        machine.failureProbability < 60 ? "text-yellow-400" : "text-red-400"
                                )}>
                                    {machine.failureProbability}%
                                </p>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                                <Timer className="h-4 w-4" />
                                <span>Maintenance in ~{machine.predictedMaintenanceDays} days</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                        {metrics.map((metric) => {
                            const Icon = metric.icon;
                            return (
                                <div
                                    key={metric.label}
                                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <Icon className="h-5 w-5" style={{ color: metric.color }} />
                                        {metric.status === "warning" && (
                                            <AlertTriangle className="h-4 w-4 text-yellow-400" />
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400">{metric.label}</p>
                                    <p className="text-xl font-bold text-white">{metric.value}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 border-b border-white/10 pb-3">
                        {[
                            { key: "realtime", label: "Real-time Data", icon: Activity },
                            { key: "predictive", label: "Predictive Analysis", icon: TrendingUp },
                            { key: "maintenance", label: "Maintenance Schedule", icon: Wrench },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                        activeTab === tab.key
                                            ? "bg-white/10 text-white"
                                            : "text-gray-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[300px]">
                        {activeTab === "realtime" && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white">24-Hour Performance History</h3>
                                <div className="h-72 bg-white/5 rounded-xl border border-white/10 p-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={performanceHistory}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                            <XAxis dataKey="time" stroke="#666" fontSize={10} />
                                            <YAxis yAxisId="left" stroke="#666" fontSize={10} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#666" fontSize={10} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: "rgba(0,0,0,0.9)",
                                                    border: "1px solid rgba(255,255,255,0.1)",
                                                    borderRadius: "8px",
                                                    color: "#fff",
                                                }}
                                            />
                                            <Legend />
                                            <Area yAxisId="left" type="monotone" dataKey="temperature" stroke="#f97316" fill="rgba(249,115,22,0.2)" name="Temp (°C)" />
                                            <Line yAxisId="right" type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} dot={false} name="Stress (%)" />
                                            <Line yAxisId="right" type="monotone" dataKey="vibration" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Vibration" />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {activeTab === "predictive" && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white">30-Day Failure Prediction</h3>
                                <div className="h-72 bg-white/5 rounded-xl border border-white/10 p-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={predictiveData}>
                                            <defs>
                                                <linearGradient id="failureGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                            <XAxis dataKey="date" stroke="#666" fontSize={10} />
                                            <YAxis stroke="#666" fontSize={10} domain={[0, 100]} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: "rgba(0,0,0,0.9)",
                                                    border: "1px solid rgba(255,255,255,0.1)",
                                                    borderRadius: "8px",
                                                    color: "#fff",
                                                }}
                                            />
                                            <Legend />
                                            <Area type="monotone" dataKey="healthScore" stroke="#22c55e" fill="url(#healthGradient)" name="Health Score" />
                                            <Area type="monotone" dataKey="failureProbability" stroke="#ef4444" fill="url(#failureGradient)" name="Failure Risk" />
                                            <Line type="monotone" dataKey="threshold" stroke="#fbbf24" strokeDasharray="5 5" name="Warning Threshold" dot={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                                    <p className="text-sm text-yellow-400">
                                        Based on current trends, maintenance is recommended within <strong>{machine.predictedMaintenanceDays} days</strong> to prevent potential failures.
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === "maintenance" && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white">Upcoming Maintenance Tasks</h3>
                                <div className="space-y-3">
                                    {maintenanceSchedule.map((task, index) => (
                                        <motion.div
                                            key={task.task}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className={cn(
                                                "p-4 rounded-xl border flex items-center justify-between",
                                                task.priority === "high" ? "bg-red-500/10 border-red-500/30" :
                                                    task.priority === "medium" ? "bg-yellow-500/10 border-yellow-500/30" :
                                                        "bg-white/5 border-white/10"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Wrench className={cn(
                                                    "h-5 w-5",
                                                    task.priority === "high" ? "text-red-400" :
                                                        task.priority === "medium" ? "text-yellow-400" : "text-gray-400"
                                                )} />
                                                <div>
                                                    <p className="font-medium text-white">{task.task}</p>
                                                    <p className="text-sm text-gray-400">Due in {task.daysUntil} days</p>
                                                </div>
                                            </div>
                                            <Badge className={cn(
                                                task.priority === "high" ? "bg-red-500/20 text-red-400" :
                                                    task.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                                                        "bg-gray-500/20 text-gray-400"
                                            )}>
                                                {task.priority.toUpperCase()}
                                            </Badge>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Operating Stats */}
                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                                        <Timer className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                                        <p className="text-2xl font-bold text-white">{machine.operatingHours}h</p>
                                        <p className="text-xs text-gray-400">Today</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                                        <Wrench className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                                        <p className="text-2xl font-bold text-white">{machine.daysSinceService}</p>
                                        <p className="text-xs text-gray-400">Days Since Service</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                                        <Fuel className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                                        <p className="text-2xl font-bold text-white">{machine.fuelLevel}%</p>
                                        <p className="text-xs text-gray-400">Fuel Level</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Clock className="h-4 w-4" />
                            Last updated: {new Date(machine.lastUpdated).toLocaleTimeString()}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
                                Close
                            </Button>
                            <Button
                                onClick={() => onScheduleMaintenance(machine.machineId)}
                                className={cn(
                                    machine.failureProbability > 50
                                        ? "bg-red-500 hover:bg-red-600"
                                        : "bg-white text-black hover:bg-gray-200"
                                )}
                            >
                                {machine.failureProbability > 50 && <AlertTriangle className="h-4 w-4 mr-2" />}
                                Schedule Maintenance
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default MachineDetailModal;
