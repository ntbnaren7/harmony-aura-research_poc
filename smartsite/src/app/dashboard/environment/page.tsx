"use client";

import { motion } from "framer-motion";
import { Cloud, Thermometer, Wind, Droplets, Sun, AlertCircle } from "lucide-react";

/**
 * Environment monitoring page placeholder
 * Shows environmental conditions from sensors
 */
export default function EnvironmentPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                    <Cloud className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Environment Monitoring</h1>
                    <p className="text-sm text-slate-400">
                        Site conditions and weather data from sensors
                    </p>
                </div>
            </div>

            {/* Environment metrics grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
                <MetricCard
                    icon={<Thermometer className="h-6 w-6 text-orange-400" />}
                    label="Temperature"
                    value="32°C"
                    status="High"
                    statusColor="text-orange-400"
                />
                <MetricCard
                    icon={<Droplets className="h-6 w-6 text-blue-400" />}
                    label="Humidity"
                    value="65%"
                    status="Normal"
                    statusColor="text-emerald-400"
                />
                <MetricCard
                    icon={<Wind className="h-6 w-6 text-slate-400" />}
                    label="Wind Speed"
                    value="12 km/h"
                    status="Low"
                    statusColor="text-emerald-400"
                />
                <MetricCard
                    icon={<Sun className="h-6 w-6 text-yellow-400" />}
                    label="UV Index"
                    value="7"
                    status="High"
                    statusColor="text-orange-400"
                />
            </motion.div>

            {/* Air quality section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-xl border border-slate-700 bg-slate-900/80 p-6"
            >
                <h2 className="text-lg font-semibold text-white mb-4">Air Quality Index</h2>
                <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-emerald-400">42</div>
                    <div>
                        <p className="text-white font-medium">Good</p>
                        <p className="text-sm text-slate-400">Air quality is satisfactory</p>
                    </div>
                </div>
                <div className="mt-4 h-3 rounded-full bg-slate-700 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500"
                        style={{ width: "42%" }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>Good (0-50)</span>
                    <span>Moderate (51-100)</span>
                    <span>Unhealthy (101+)</span>
                </div>
            </motion.div>

            {/* Coming soon notice */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <AlertCircle className="h-5 w-5 text-slate-400" />
                <p className="text-sm text-slate-400">
                    Environmental alerts and worker-environment stress correlation analysis coming soon.
                </p>
            </div>
        </div>
    );
}

function MetricCard({
    icon,
    label,
    value,
    status,
    statusColor,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    status: string;
    statusColor: string;
}) {
    return (
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <div className="flex items-center gap-2 mb-3">{icon}</div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm text-slate-400">{label}</p>
            <p className={`text-xs mt-1 ${statusColor}`}>{status}</p>
        </div>
    );
}
