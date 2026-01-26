"use client";

import { MeshGradient } from "@paper-design/shaders-react";

interface DashboardBackgroundProps {
    speed?: number;
}

/**
 * Animated mesh gradient background for dashboard
 * Uses @paper-design/shaders-react for WebGL-powered effects
 * Monochrome dark theme - black/grey/white only
 */
export function DashboardBackground({ speed = 0.3 }: DashboardBackgroundProps) {
    return (
        <div className="fixed inset-0 -z-10">
            {/* Main Mesh Gradient */}
            <MeshGradient
                className="w-full h-full absolute inset-0"
                colors={["#000000", "#0a0a0a", "#1a1a1a", "#2a2a2a"]}
                speed={speed}
            />

            {/* Subtle lighting overlay effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="absolute top-1/4 left-1/3 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl animate-pulse"
                    style={{ animationDuration: "8s" }}
                />
                <div
                    className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-white/[0.015] rounded-full blur-2xl animate-pulse"
                    style={{ animationDuration: "6s", animationDelay: "2s" }}
                />
                <div
                    className="absolute top-1/2 right-1/3 w-32 h-32 bg-white/[0.01] rounded-full blur-xl animate-pulse"
                    style={{ animationDuration: "10s", animationDelay: "1s" }}
                />
            </div>

            {/* Vignette overlay for depth */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)] pointer-events-none" />
        </div>
    );
}

export default DashboardBackground;
