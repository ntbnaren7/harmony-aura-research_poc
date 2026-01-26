/**
 * Core data contract for worker vitals from ESP32 sensors
 */
export interface WorkerVitals {
    /** Unique identifier for the worker (anonymized) */
    workerId: string;
    /** Heart rate in beats per minute */
    heartRate: number;
    /** Heart rate variability in milliseconds */
    hrv: number;
    /** Body temperature in Celsius */
    temperature: number;
    /** Number of sudden movements detected */
    jerkCount: number;
    /** Machine stress index (0-100) */
    machineStressIndex: number;
    /** Root mean square of vibration readings */
    vibrationRms: number;
    /** Construction Integrity Score (0-100) */
    cisScore: number;
    /** Risk state derived from cisScore thresholds */
    riskState: RiskState;
    /** Whether supervisor has issued a break flag */
    breakFlag: boolean;
    /** ISO timestamp of last sensor update */
    lastUpdated: string;
}

export type RiskState = "LOW" | "MEDIUM" | "HIGH";

/**
 * Risk style configuration for UI components
 */
export interface RiskStyleConfig {
    background: string;
    border: string;
    spotlight: string;
    textColor: string;
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
}

/**
 * System status for dashboard header
 */
export type SystemStatus = "ONLINE" | "DEGRADED" | "OFFLINE";

/**
 * Dashboard statistics
 */
export interface DashboardStats {
    systemStatus: SystemStatus;
    totalActiveWorkers: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
}

/**
 * Machine status types
 */
export type MachineStatus = "OPERATIONAL" | "WARNING" | "MAINTENANCE" | "OFFLINE";

/**
 * Machine data from IoT sensors for predictive maintenance
 */
export interface MachineData {
    /** Unique machine identifier */
    machineId: string;
    /** Machine display name */
    name: string;
    /** Machine type category */
    type: "CRANE" | "EXCAVATOR" | "LOADER" | "DRILL" | "COMPRESSOR" | "GENERATOR";
    /** Current operational status */
    status: MachineStatus;
    /** Stress index (0-100) */
    stressIndex: number;
    /** Operating temperature in Celsius */
    temperature: number;
    /** Vibration RMS value */
    vibrationRms: number;
    /** Operating hours today */
    operatingHours: number;
    /** Days since last service */
    daysSinceService: number;
    /** Fuel/power level percentage */
    fuelLevel: number;
    /** Oil pressure in PSI */
    oilPressure: number;
    /** Predicted failure probability (0-100) */
    failureProbability: number;
    /** Predicted days until maintenance needed */
    predictedMaintenanceDays: number;
    /** Health score (0-100) */
    healthScore: number;
    /** ISO timestamp of last update */
    lastUpdated: string;
}

