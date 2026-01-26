"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { WorkerVitals } from "@/types/worker";

// FastAPI backend URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Subscription status for realtime connection
 */
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

/**
 * Options for realtime subscription
 */
interface RealtimeOptions {
    /** Update interval in milliseconds */
    updateInterval?: number;
    /** Enable automatic reconnection */
    autoReconnect?: boolean;
    /** Initial worker count for mock data (unused with real API) */
    initialWorkerCount?: number;
}

/**
 * Transform API response to WorkerVitals format
 */
function transformWorkerResponse(apiWorker: {
    worker_id: string;
    heart_rate: number | null;
    hrv: number | null;
    temperature: number | null;
    jerk_count: number | null;
    machine_stress_index: number | null;
    vibration_rms: number | null;
    cis_score: number | null;
    risk_state: string | null;
    break_flag: boolean | null;
    last_updated: string | null;
}): WorkerVitals {
    return {
        workerId: apiWorker.worker_id,
        heartRate: apiWorker.heart_rate ?? 0,
        hrv: apiWorker.hrv ?? 0,
        temperature: apiWorker.temperature ?? 36.5,
        jerkCount: apiWorker.jerk_count ?? 0,
        machineStressIndex: apiWorker.machine_stress_index ?? 0,
        vibrationRms: apiWorker.vibration_rms ?? 0,
        cisScore: apiWorker.cis_score ?? 100,
        riskState: (apiWorker.risk_state as "LOW" | "MEDIUM" | "HIGH") ?? "LOW",
        breakFlag: apiWorker.break_flag ?? false,
        lastUpdated: apiWorker.last_updated ?? new Date().toISOString(),
    };
}

/**
 * Hook for managing realtime worker data subscription
 * Fetches from FastAPI backend connected to Supabase PostgreSQL
 */
export function useRealtimeWorkers(options: RealtimeOptions = {}) {
    const {
        updateInterval = 5000,
        autoReconnect = true,
    } = options;

    const [workers, setWorkers] = useState<WorkerVitals[]>([]);
    const [status, setStatus] = useState<ConnectionStatus>("connecting");
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);

    // Fetch workers from API
    const fetchWorkers = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/workers`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (mountedRef.current && data.workers) {
                const transformedWorkers = data.workers.map(transformWorkerResponse);
                setWorkers(transformedWorkers);
                setStatus("connected");
                setError(null);
            }
        } catch (err) {
            if (mountedRef.current) {
                console.error("Failed to fetch workers:", err);
                setStatus("error");
                setError(err instanceof Error ? err.message : "Failed to fetch workers");
            }
        }
    }, []);

    // Initialize connection and data
    useEffect(() => {
        mountedRef.current = true;

        const connect = async () => {
            try {
                setStatus("connecting");
                setError(null);

                // Initial fetch
                await fetchWorkers();

                // Set up periodic updates
                intervalRef.current = setInterval(() => {
                    if (!mountedRef.current) return;
                    fetchWorkers();
                }, updateInterval);

            } catch (err) {
                if (!mountedRef.current) return;
                setStatus("error");
                setError(err instanceof Error ? err.message : "Connection failed");

                if (autoReconnect) {
                    setTimeout(connect, 5000);
                }
            }
        };

        connect();

        return () => {
            mountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [updateInterval, autoReconnect, fetchWorkers]);

    // Issue break to a worker
    const issueBreak = useCallback(async (workerId: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/workers/${workerId}/break`, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to issue break");
            }

            // Optimistically update UI
            setWorkers(prevWorkers =>
                prevWorkers.map(worker =>
                    worker.workerId === workerId
                        ? { ...worker, breakFlag: true, lastUpdated: new Date().toISOString() }
                        : worker
                )
            );

            return true;
        } catch {
            return false;
        }
    }, []);

    // Reconnect manually
    const reconnect = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        setStatus("connecting");
        fetchWorkers();
    }, [fetchWorkers]);

    return {
        workers,
        status,
        error,
        issueBreak,
        reconnect,
        isLoading: status === "connecting",
    };
}
