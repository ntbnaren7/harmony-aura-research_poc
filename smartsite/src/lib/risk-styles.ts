import type { RiskState, RiskStyleConfig } from "@/types/worker";

/**
 * Get risk style configuration based on CIS score
 * @param cisScore - Construction Integrity Score (0-100)
 * @returns Risk style configuration for UI components
 */
export function getRiskStyles(cisScore: number): RiskStyleConfig {
    if (cisScore <= 30) {
        return {
            background: "bg-red-900/20",
            border: "border-red-500",
            spotlight: "rgba(239, 68, 68, 0.35)",
            textColor: "text-red-400",
            badgeVariant: "destructive",
        };
    }

    if (cisScore <= 70) {
        return {
            background: "bg-yellow-900/20",
            border: "border-yellow-500",
            spotlight: "rgba(234, 179, 8, 0.35)",
            textColor: "text-yellow-400",
            badgeVariant: "secondary",
        };
    }

    return {
        background: "bg-green-900/20",
        border: "border-emerald-500",
        spotlight: "rgba(16, 185, 129, 0.35)",
        textColor: "text-emerald-400",
        badgeVariant: "default",
    };
}

/**
 * Derive risk state from CIS score
 * @param cisScore - Construction Integrity Score (0-100)
 * @returns Risk state category
 */
export function getRiskState(cisScore: number): RiskState {
    if (cisScore <= 30) return "HIGH";
    if (cisScore <= 70) return "MEDIUM";
    return "LOW";
}

/**
 * Get human-readable risk label
 * @param riskState - Risk state category
 * @returns Human-readable label
 */
export function getRiskLabel(riskState: RiskState): string {
    switch (riskState) {
        case "HIGH":
            return "High Risk";
        case "MEDIUM":
            return "Medium Risk";
        case "LOW":
            return "Low Risk";
    }
}

/**
 * Format timestamp for display
 * @param isoTimestamp - ISO timestamp string
 * @returns Formatted relative time string
 */
export function formatLastUpdated(isoTimestamp: string): string {
    const date = new Date(isoTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 10) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;

    return date.toLocaleDateString();
}
