"use client";

import { useRef, useState, type ReactNode, type MouseEvent } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
    children: ReactNode;
    className?: string;
    spotlightColor?: string;
    borderColor?: string;
    backgroundColor?: string;
    onClick?: () => void;
}

/**
 * Reusable spotlight effect card with mouse-tracking glow
 */
export function SpotlightCard({
    children,
    className,
    spotlightColor = "rgba(16, 185, 129, 0.35)",
    borderColor = "border-emerald-500",
    backgroundColor = "bg-slate-900/80",
    onClick,
}: SpotlightCardProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    return (
        <motion.div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn(
                "relative overflow-hidden rounded-xl border backdrop-blur-sm",
                backgroundColor,
                borderColor,
                className
            )}
        >
            {/* Spotlight gradient overlay */}
            <motion.div
                className="pointer-events-none absolute inset-0 z-0"
                animate={{
                    opacity: isHovered ? 1 : 0,
                    background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, ${spotlightColor}, transparent 40%)`,
                }}
                transition={{ duration: 0.15, ease: "easeOut" }}
            />

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </motion.div>
    );
}
