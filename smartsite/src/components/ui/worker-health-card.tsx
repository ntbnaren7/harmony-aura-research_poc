"use client";

import { Heart, Activity, Thermometer, AlertTriangle, Coffee, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import type { WorkerVitals } from "@/types/worker";
import { getRiskStyles, getRiskLabel, formatLastUpdated } from "@/lib/risk-styles";
import { cn } from "@/lib/utils";

interface WorkerHealthCardProps {
    worker: WorkerVitals;
    onIssueBreak: (workerId: string) => void;
    onClick?: (worker: WorkerVitals) => void;
    isBreakLoading?: boolean;
}

/**
 * Worker health vitals card with risk-based styling
 * Click to open detailed view with charts
 */
export function WorkerHealthCard({
    worker,
    onIssueBreak,
    onClick,
    isBreakLoading = false,
}: WorkerHealthCardProps) {
    const riskStyles = getRiskStyles(worker.cisScore);
    const riskLabel = getRiskLabel(worker.riskState);

    return (
        <SpotlightCard
            spotlightColor={riskStyles.spotlight}
            borderColor={riskStyles.border}
            backgroundColor={riskStyles.background}
            className={cn("w-full", onClick && "cursor-pointer")}
            onClick={() => onClick?.(worker)}
        >
            <div className="p-5">
                {/* Header: Worker ID and Risk Badge */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800/80">
                            <Activity className={cn("h-5 w-5", riskStyles.textColor)} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Worker ID</p>
                            <p className="text-lg font-bold text-white">{worker.workerId}</p>
                        </div>
                    </div>
                    <Badge variant={riskStyles.badgeVariant} className="text-xs">
                        {riskLabel}
                    </Badge>
                </div>

                {/* Main Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Heart Rate */}
                    <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-400" />
                        <div>
                            <p className="text-xs text-slate-400">Heart Rate</p>
                            <p className="text-lg font-semibold text-white">
                                {worker.heartRate} <span className="text-xs text-slate-400">BPM</span>
                            </p>
                        </div>
                    </div>

                    {/* HRV */}
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-400" />
                        <div>
                            <p className="text-xs text-slate-400">HRV</p>
                            <p className="text-lg font-semibold text-white">
                                {worker.hrv} <span className="text-xs text-slate-400">ms</span>
                            </p>
                        </div>
                    </div>

                    {/* Temperature */}
                    <div className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-orange-400" />
                        <div>
                            <p className="text-xs text-slate-400">Temperature</p>
                            <p className="text-lg font-semibold text-white">
                                {worker.temperature.toFixed(1)} <span className="text-xs text-slate-400">°C</span>
                            </p>
                        </div>
                    </div>

                    {/* Machine Stress */}
                    <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-400" />
                        <div>
                            <p className="text-xs text-slate-400">Machine Stress</p>
                            <p className="text-lg font-semibold text-white">
                                {worker.machineStressIndex} <span className="text-xs text-slate-400">/ 100</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* CIS Score Bar */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">CIS Score</span>
                        <span className={cn("text-sm font-bold", riskStyles.textColor)}>
                            {worker.cisScore}/100
                        </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-700/50 overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                worker.cisScore <= 30 ? "bg-red-500" :
                                    worker.cisScore <= 70 ? "bg-yellow-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${worker.cisScore}%` }}
                        />
                    </div>
                </div>

                {/* Footer: Actions and Timestamp */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs">{formatLastUpdated(worker.lastUpdated)}</span>
                    </div>

                    {worker.breakFlag ? (
                        <div className="flex items-center gap-1.5 text-amber-400">
                            <Coffee className="h-4 w-4" />
                            <span className="text-xs font-medium">Break Issued</span>
                        </div>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onIssueBreak(worker.workerId)}
                            disabled={isBreakLoading}
                            className={cn(
                                "text-xs h-8",
                                worker.riskState === "HIGH" && "border-red-500/50 text-red-400 hover:bg-red-500/20"
                            )}
                        >
                            {worker.riskState === "HIGH" && <AlertTriangle className="h-3 w-3 mr-1" />}
                            Issue Break
                        </Button>
                    )}
                </div>
            </div>
        </SpotlightCard>
    );
}

/**
 * Skeleton loader for worker health card
 */
export function WorkerHealthCardSkeleton() {
    return (
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-5 animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-slate-700" />
                    <div>
                        <div className="h-3 w-16 bg-slate-700 rounded mb-1" />
                        <div className="h-5 w-20 bg-slate-700 rounded" />
                    </div>
                </div>
                <div className="h-5 w-16 bg-slate-700 rounded-full" />
            </div>

            {/* Metrics skeleton */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="h-4 w-4 bg-slate-700 rounded" />
                        <div>
                            <div className="h-3 w-14 bg-slate-700 rounded mb-1" />
                            <div className="h-5 w-12 bg-slate-700 rounded" />
                        </div>
                    </div>
                ))}
            </div>

            {/* CIS bar skeleton */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                    <div className="h-3 w-16 bg-slate-700 rounded" />
                    <div className="h-4 w-12 bg-slate-700 rounded" />
                </div>
                <div className="h-2 w-full bg-slate-700 rounded-full" />
            </div>

            {/* Footer skeleton */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                <div className="h-3 w-20 bg-slate-700 rounded" />
                <div className="h-8 w-24 bg-slate-700 rounded" />
            </div>
        </div>
    );
}
