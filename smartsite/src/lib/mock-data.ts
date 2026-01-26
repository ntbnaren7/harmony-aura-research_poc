import type { WorkerVitals, DashboardStats, RiskState } from "@/types/worker";
import { getRiskState } from "./risk-styles";

/**
 * Generate a random worker ID (anonymized)
 */
function generateWorkerId(): string {
    const prefix = ["WK", "OP", "TM"][Math.floor(Math.random() * 3)];
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}-${number}`;
}

/**
 * Generate mock worker vitals data
 * @param count - Number of workers to generate
 * @returns Array of worker vitals
 */
export function generateMockWorkers(count: number = 12): WorkerVitals[] {
    const workers: WorkerVitals[] = [];

    for (let i = 0; i < count; i++) {
        // Generate realistic but varied data
        const cisScore = Math.floor(Math.random() * 100);
        const riskState = getRiskState(cisScore);

        // Correlate other metrics with risk state for realism
        const baseHeartRate = riskState === "HIGH" ? 110 : riskState === "MEDIUM" ? 90 : 75;
        const heartRate = baseHeartRate + Math.floor(Math.random() * 20) - 10;

        const baseHrv = riskState === "HIGH" ? 25 : riskState === "MEDIUM" ? 45 : 65;
        const hrv = baseHrv + Math.floor(Math.random() * 20) - 10;

        const baseTemp = riskState === "HIGH" ? 38 : riskState === "MEDIUM" ? 37.2 : 36.8;
        const temperature = baseTemp + (Math.random() * 0.6 - 0.3);

        const baseStress = riskState === "HIGH" ? 75 : riskState === "MEDIUM" ? 50 : 25;
        const machineStressIndex = baseStress + Math.floor(Math.random() * 20) - 10;

        workers.push({
            workerId: generateWorkerId(),
            heartRate: Math.max(60, Math.min(150, heartRate)),
            hrv: Math.max(10, Math.min(100, hrv)),
            temperature: Math.round(temperature * 10) / 10,
            jerkCount: Math.floor(Math.random() * (riskState === "HIGH" ? 15 : 5)),
            machineStressIndex: Math.max(0, Math.min(100, machineStressIndex)),
            vibrationRms: Math.round((Math.random() * 5 + 0.5) * 100) / 100,
            cisScore,
            riskState,
            breakFlag: Math.random() < 0.15, // 15% chance of break flag
            lastUpdated: new Date(Date.now() - Math.floor(Math.random() * 60000)).toISOString(),
        });
    }

    // Sort by risk: HIGH first, then MEDIUM, then LOW
    return workers.sort((a, b) => {
        const order: Record<RiskState, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return order[a.riskState] - order[b.riskState];
    });
}

/**
 * Generate dashboard statistics from worker data
 * @param workers - Array of worker vitals
 * @returns Dashboard statistics
 */
export function generateDashboardStats(workers: WorkerVitals[]): DashboardStats {
    const highRiskCount = workers.filter(w => w.riskState === "HIGH").length;
    const mediumRiskCount = workers.filter(w => w.riskState === "MEDIUM").length;
    const lowRiskCount = workers.filter(w => w.riskState === "LOW").length;

    // Determine system status based on high-risk workers
    let systemStatus: DashboardStats["systemStatus"] = "ONLINE";
    if (highRiskCount > workers.length * 0.3) {
        systemStatus = "DEGRADED";
    }
    if (highRiskCount > workers.length * 0.5) {
        systemStatus = "OFFLINE";
    }

    return {
        systemStatus,
        totalActiveWorkers: workers.length,
        highRiskCount,
        mediumRiskCount,
        lowRiskCount,
    };
}

/**
 * Simulate a worker data update (for realtime effect)
 * @param worker - Existing worker to update
 * @returns Updated worker vitals
 */
export function simulateWorkerUpdate(worker: WorkerVitals): WorkerVitals {
    // Small random variations
    const heartRateDelta = Math.floor(Math.random() * 6) - 3;
    const hrvDelta = Math.floor(Math.random() * 6) - 3;
    const tempDelta = (Math.random() * 0.2) - 0.1;
    const cisDelta = Math.floor(Math.random() * 10) - 5;

    const newCisScore = Math.max(0, Math.min(100, worker.cisScore + cisDelta));

    return {
        ...worker,
        heartRate: Math.max(60, Math.min(150, worker.heartRate + heartRateDelta)),
        hrv: Math.max(10, Math.min(100, worker.hrv + hrvDelta)),
        temperature: Math.round((worker.temperature + tempDelta) * 10) / 10,
        cisScore: newCisScore,
        riskState: getRiskState(newCisScore),
        jerkCount: Math.max(0, worker.jerkCount + (Math.random() < 0.3 ? 1 : 0)),
        lastUpdated: new Date().toISOString(),
    };
}
