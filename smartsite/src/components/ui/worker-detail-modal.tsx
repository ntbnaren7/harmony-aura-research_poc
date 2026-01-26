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
    Heart,
    Activity,
    Thermometer,
    Zap,
    Clock,
    TrendingUp,
    TrendingDown,
    Coffee,
    AlertTriangle,
    X,
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
} from "recharts";
import type { WorkerVitals } from "@/types/worker";
import { getRiskStyles, getRiskLabel } from "@/lib/risk-styles";
import { cn } from "@/lib/utils";

interface WorkerDetailModalProps {
    worker: WorkerVitals | null;
    isOpen: boolean;
    onClose: () => void;
    onIssueBreak: (workerId: string) => void;
}

// Generate mock historical data for charts
function generateHistoricalData(worker: WorkerVitals, hours: number = 8) {
    const data = [];
    const now = Date.now();
    const interval = (hours * 60 * 60 * 1000) / 24; // 24 data points over the period

    for (let i = 24; i >= 0; i--) {
        const time = new Date(now - i * interval);
        const timeLabel = time.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });

        // Generate realistic fluctuations
        const hrVariation = Math.sin(i * 0.5) * 15 + (Math.random() - 0.5) * 10;
        const hrvVariation = Math.cos(i * 0.3) * 10 + (Math.random() - 0.5) * 8;
        const tempVariation = Math.sin(i * 0.2) * 0.5 + (Math.random() - 0.5) * 0.3;
        const stressVariation = Math.sin(i * 0.4) * 20 + (Math.random() - 0.5) * 15;

        data.push({
            time: timeLabel,
            heartRate: Math.max(60, Math.min(140, worker.heartRate + hrVariation)),
            hrv: Math.max(15, Math.min(80, worker.hrv + hrvVariation)),
            temperature: Math.max(35.5, Math.min(39, worker.temperature + tempVariation)),
            machineStress: Math.max(10, Math.min(100, worker.machineStressIndex + stressVariation)),
            cisScore: Math.max(5, Math.min(100, worker.cisScore + (Math.random() - 0.5) * 20)),
        });
    }
    return data;
}

export function WorkerDetailModal({
    worker,
    isOpen,
    onClose,
    onIssueBreak,
}: WorkerDetailModalProps) {
    const [selectedMetric, setSelectedMetric] = useState<"heartRate" | "hrv" | "temperature" | "machineStress">("heartRate");

    const historicalData = useMemo(() => {
        if (!worker) return [];
        return generateHistoricalData(worker);
    }, [worker]);

    if (!worker) return null;

    const riskStyles = getRiskStyles(worker.cisScore);
    const riskLabel = getRiskLabel(worker.riskState);

    const metrics = [
        {
            key: "heartRate" as const,
            label: "Heart Rate",
            value: worker.heartRate,
            unit: "BPM",
            icon: Heart,
            color: "#ef4444",
            gradientId: "heartGradient",
            trend: worker.heartRate > 100 ? "up" : "down",
            status: worker.heartRate > 110 ? "critical" : worker.heartRate > 100 ? "warning" : "normal",
        },
        {
            key: "hrv" as const,
            label: "HRV",
            value: worker.hrv,
            unit: "ms",
            icon: Activity,
            color: "#3b82f6",
            gradientId: "hrvGradient",
            trend: worker.hrv < 30 ? "down" : "up",
            status: worker.hrv < 25 ? "critical" : worker.hrv < 35 ? "warning" : "normal",
        },
        {
            key: "temperature" as const,
            label: "Temperature",
            value: worker.temperature.toFixed(1),
            unit: "°C",
            icon: Thermometer,
            color: "#f97316",
            gradientId: "tempGradient",
            trend: worker.temperature > 37.5 ? "up" : "down",
            status: worker.temperature > 38 ? "critical" : worker.temperature > 37.5 ? "warning" : "normal",
        },
        {
            key: "machineStress" as const,
            label: "Machine Stress",
            value: worker.machineStressIndex,
            unit: "/ 100",
            icon: Zap,
            color: "#a855f7",
            gradientId: "stressGradient",
            trend: worker.machineStressIndex > 70 ? "up" : "down",
            status: worker.machineStressIndex > 80 ? "critical" : worker.machineStressIndex > 60 ? "warning" : "normal",
        },
    ];

    const selectedMetricData = metrics.find((m) => m.key === selectedMetric)!;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-black/95 border-white/10 backdrop-blur-xl text-white p-0 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "h-14 w-14 rounded-xl flex items-center justify-center",
                                riskStyles.background
                            )}>
                                <Activity className={cn("h-7 w-7", riskStyles.textColor)} />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold text-white">
                                    Worker {worker.workerId}
                                </DialogTitle>
                                <p className="text-gray-400 text-sm mt-1">Real-time health monitoring</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={riskStyles.badgeVariant} className="text-sm px-3 py-1">
                                {riskLabel}
                            </Badge>
                            {worker.breakFlag && (
                                <Badge variant="outline" className="text-amber-400 border-amber-400/50">
                                    <Coffee className="h-3 w-3 mr-1" />
                                    On Break
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* CIS Score Banner */}
                    <div className={cn(
                        "p-4 rounded-xl border",
                        worker.cisScore <= 30 ? "bg-red-500/10 border-red-500/30" :
                            worker.cisScore <= 70 ? "bg-yellow-500/10 border-yellow-500/30" :
                                "bg-green-500/10 border-green-500/30"
                    )}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Composite Index Score (CIS)</p>
                                <p className={cn("text-4xl font-bold", riskStyles.textColor)}>
                                    {worker.cisScore}<span className="text-lg text-gray-500">/100</span>
                                </p>
                            </div>
                            <div className="w-48">
                                <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${worker.cisScore}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={cn(
                                            "h-full rounded-full",
                                            worker.cisScore <= 30 ? "bg-red-500" :
                                                worker.cisScore <= 70 ? "bg-yellow-500" : "bg-green-500"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-4 gap-3">
                        {metrics.map((metric) => {
                            const Icon = metric.icon;
                            const isSelected = selectedMetric === metric.key;
                            const TrendIcon = metric.trend === "up" ? TrendingUp : TrendingDown;

                            return (
                                <motion.button
                                    key={metric.key}
                                    onClick={() => setSelectedMetric(metric.key)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={cn(
                                        "p-4 rounded-xl border transition-all text-left",
                                        isSelected
                                            ? "bg-white/10 border-white/30"
                                            : "bg-white/5 border-white/10 hover:bg-white/10"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <Icon className="h-5 w-5" style={{ color: metric.color }} />
                                        <TrendIcon
                                            className={cn(
                                                "h-4 w-4",
                                                metric.status === "critical" ? "text-red-400" :
                                                    metric.status === "warning" ? "text-yellow-400" : "text-green-400"
                                            )}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400">{metric.label}</p>
                                    <p className="text-xl font-bold text-white">
                                        {metric.value}
                                        <span className="text-xs text-gray-500 ml-1">{metric.unit}</span>
                                    </p>
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Chart */}
                    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">
                                {selectedMetricData.label} History
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Clock className="h-4 w-4" />
                                Last 8 hours
                            </div>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historicalData}>
                                    <defs>
                                        <linearGradient id={selectedMetricData.gradientId} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={selectedMetricData.color} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={selectedMetricData.color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis
                                        dataKey="time"
                                        stroke="#666"
                                        fontSize={10}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#666"
                                        fontSize={10}
                                        tickLine={false}
                                        domain={["auto", "auto"]}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "rgba(0,0,0,0.9)",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: "8px",
                                            color: "#fff",
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey={selectedMetric}
                                        stroke={selectedMetricData.color}
                                        strokeWidth={2}
                                        fill={`url(#${selectedMetricData.gradientId})`}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Clock className="h-4 w-4" />
                            Last updated: {new Date(worker.lastUpdated).toLocaleTimeString()}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
                                Close
                            </Button>
                            {!worker.breakFlag && (
                                <Button
                                    onClick={() => onIssueBreak(worker.workerId)}
                                    className={cn(
                                        worker.riskState === "HIGH"
                                            ? "bg-red-500 hover:bg-red-600"
                                            : "bg-white text-black hover:bg-gray-200"
                                    )}
                                >
                                    {worker.riskState === "HIGH" && <AlertTriangle className="h-4 w-4 mr-2" />}
                                    Issue Break
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default WorkerDetailModal;
