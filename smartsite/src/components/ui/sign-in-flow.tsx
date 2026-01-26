"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Shield, ArrowLeft } from "lucide-react";
import * as THREE from "three";
import { useAuth } from "@/lib/auth";

type Uniforms = {
    [key: string]: {
        value: number[] | number[][] | number;
        type: string;
    };
};

interface ShaderProps {
    source: string;
    uniforms: {
        [key: string]: {
            value: number[] | number[][] | number;
            type: string;
        };
    };
    maxFps?: number;
}

interface SignInPageProps {
    className?: string;
}

export const CanvasRevealEffect = ({
    animationSpeed = 10,
    opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
    colors = [[0, 255, 255]],
    containerClassName,
    dotSize,
    showGradient = true,
    reverse = false,
}: {
    animationSpeed?: number;
    opacities?: number[];
    colors?: number[][];
    containerClassName?: string;
    dotSize?: number;
    showGradient?: boolean;
    reverse?: boolean;
}) => {
    return (
        <div className={cn("h-full relative w-full", containerClassName)}>
            <div className="h-full w-full">
                <DotMatrix
                    colors={colors ?? [[0, 255, 255]]}
                    dotSize={dotSize ?? 3}
                    opacities={opacities ?? [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1]}
                    shader={`${reverse ? 'u_reverse_active' : 'false'}_;animation_speed_factor_${animationSpeed.toFixed(1)}_;`}
                    center={["x", "y"]}
                />
            </div>
            {showGradient && (
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
            )}
        </div>
    );
};

interface DotMatrixProps {
    colors?: number[][];
    opacities?: number[];
    totalSize?: number;
    dotSize?: number;
    shader?: string;
    center?: ("x" | "y")[];
}

const DotMatrix: React.FC<DotMatrixProps> = ({
    colors = [[0, 0, 0]],
    opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14],
    totalSize = 20,
    dotSize = 2,
    shader = "",
    center = ["x", "y"],
}) => {
    const uniforms = React.useMemo(() => {
        let colorsArray = [colors[0], colors[0], colors[0], colors[0], colors[0], colors[0]];
        if (colors.length === 2) {
            colorsArray = [colors[0], colors[0], colors[0], colors[1], colors[1], colors[1]];
        } else if (colors.length === 3) {
            colorsArray = [colors[0], colors[0], colors[1], colors[1], colors[2], colors[2]];
        }
        return {
            u_colors: {
                value: colorsArray.map((color) => [color[0] / 255, color[1] / 255, color[2] / 255]),
                type: "uniform3fv",
            },
            u_opacities: { value: opacities, type: "uniform1fv" },
            u_total_size: { value: totalSize, type: "uniform1f" },
            u_dot_size: { value: dotSize, type: "uniform1f" },
            u_reverse: { value: shader.includes("u_reverse_active") ? 1 : 0, type: "uniform1i" },
        };
    }, [colors, opacities, totalSize, dotSize, shader]);

    return (
        <Shader
            source={`
        precision mediump float;
        in vec2 fragCoord;
        uniform float u_time;
        uniform float u_opacities[10];
        uniform vec3 u_colors[6];
        uniform float u_total_size;
        uniform float u_dot_size;
        uniform vec2 u_resolution;
        uniform int u_reverse;
        out vec4 fragColor;

        float PHI = 1.61803398874989484820459;
        float random(vec2 xy) { return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x); }
        float map(float value, float min1, float max1, float min2, float max2) { return min2 + (value - min1) * (max2 - min2) / (max1 - min1); }

        void main() {
            vec2 st = fragCoord.xy;
            ${center.includes("x") ? "st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));" : ""}
            ${center.includes("y") ? "st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));" : ""}

            float opacity = step(0.0, st.x);
            opacity *= step(0.0, st.y);

            vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

            float frequency = 5.0;
            float show_offset = random(st2);
            float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
            opacity *= u_opacities[int(rand * 10.0)];
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

            vec3 color = u_colors[int(show_offset * 6.0)];

            float animation_speed_factor = 0.5;
            vec2 center_grid = u_resolution / 2.0 / u_total_size;
            float dist_from_center = distance(center_grid, st2);

            float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);
            float max_grid_dist = distance(center_grid, vec2(0.0, 0.0));
            float timing_offset_outro = (max_grid_dist - dist_from_center) * 0.02 + (random(st2 + 42.0) * 0.2);

            float current_timing_offset;
            if (u_reverse == 1) {
                current_timing_offset = timing_offset_outro;
                opacity *= 1.0 - step(current_timing_offset, u_time * animation_speed_factor);
                opacity *= clamp((step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
            } else {
                current_timing_offset = timing_offset_intro;
                opacity *= step(current_timing_offset, u_time * animation_speed_factor);
                opacity *= clamp((1.0 - step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
            }

            fragColor = vec4(color, opacity);
            fragColor.rgb *= fragColor.a;
        }`}
            uniforms={uniforms}
            maxFps={60}
        />
    );
};

const ShaderMaterial = ({ source, uniforms, maxFps = 60 }: { source: string; hovered?: boolean; maxFps?: number; uniforms: Uniforms }) => {
    const { size } = useThree();
    const ref = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const timestamp = clock.getElapsedTime();
        const material = ref.current.material as THREE.ShaderMaterial;
        material.uniforms.u_time.value = timestamp;
    });

    const getUniforms = () => {
        const preparedUniforms: Record<string, { value: unknown; type?: string }> = {};
        for (const uniformName in uniforms) {
            const uniform = uniforms[uniformName];
            switch (uniform.type) {
                case "uniform1f":
                    preparedUniforms[uniformName] = { value: uniform.value, type: "1f" };
                    break;
                case "uniform1i":
                    preparedUniforms[uniformName] = { value: uniform.value, type: "1i" };
                    break;
                case "uniform3f":
                    preparedUniforms[uniformName] = { value: new THREE.Vector3().fromArray(uniform.value as number[]), type: "3f" };
                    break;
                case "uniform1fv":
                    preparedUniforms[uniformName] = { value: uniform.value, type: "1fv" };
                    break;
                case "uniform3fv":
                    preparedUniforms[uniformName] = { value: (uniform.value as number[][]).map((v) => new THREE.Vector3().fromArray(v)), type: "3fv" };
                    break;
                case "uniform2f":
                    preparedUniforms[uniformName] = { value: new THREE.Vector2().fromArray(uniform.value as number[]), type: "2f" };
                    break;
            }
        }
        preparedUniforms["u_time"] = { value: 0, type: "1f" };
        preparedUniforms["u_resolution"] = { value: new THREE.Vector2(size.width * 2, size.height * 2) };
        return preparedUniforms;
    };

    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            vertexShader: `
        precision mediump float;
        in vec2 coordinates;
        uniform vec2 u_resolution;
        out vec2 fragCoord;
        void main(){
          float x = position.x;
          float y = position.y;
          gl_Position = vec4(x, y, 0.0, 1.0);
          fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
          fragCoord.y = u_resolution.y - fragCoord.y;
        }
      `,
            fragmentShader: source,
            uniforms: getUniforms(),
            glslVersion: THREE.GLSL3,
            blending: THREE.CustomBlending,
            blendSrc: THREE.SrcAlphaFactor,
            blendDst: THREE.OneFactor,
        });
    }, [size.width, size.height, source]);

    return (
        <mesh ref={ref}>
            <planeGeometry args={[2, 2]} />
            <primitive object={material} attach="material" />
        </mesh>
    );
};

const Shader: React.FC<ShaderProps> = ({ source, uniforms, maxFps = 60 }) => {
    return (
        <Canvas className="absolute inset-0 h-full w-full">
            <ShaderMaterial source={source} uniforms={uniforms} maxFps={maxFps} />
        </Canvas>
    );
};

export const SmartSiteSignIn = ({ className }: SignInPageProps) => {
    const router = useRouter();
    const { login, isLoading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [step, setStep] = useState<"email" | "password" | "success">("email");
    const [error, setError] = useState<string | null>(null);
    const [initialCanvasVisible, setInitialCanvasVisible] = useState(true);
    const [reverseCanvasVisible, setReverseCanvasVisible] = useState(false);

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            setStep("password");
            setError(null);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 4) {
            setError("Password must be at least 4 characters");
            return;
        }

        // Show animation
        setReverseCanvasVisible(true);
        setTimeout(() => setInitialCanvasVisible(false), 50);

        const success = await login(email, password);

        if (success) {
            setStep("success");
            setTimeout(() => router.push("/dashboard"), 1500);
        } else {
            setError("Invalid credentials");
            setInitialCanvasVisible(true);
            setReverseCanvasVisible(false);
        }
    };

    const handleBackClick = () => {
        if (step === "password") {
            setStep("email");
            setPassword("");
            setError(null);
        } else {
            router.push("/");
        }
        setReverseCanvasVisible(false);
        setInitialCanvasVisible(true);
    };

    return (
        <div className={cn("flex w-full flex-col min-h-screen bg-black relative", className)}>
            {/* Canvas Background - Now uses white/grey dots */}
            <div className="absolute inset-0 z-0">
                {initialCanvasVisible && (
                    <div className="absolute inset-0">
                        <CanvasRevealEffect
                            animationSpeed={3}
                            containerClassName="bg-black"
                            colors={[[255, 255, 255], [180, 180, 180]]}
                            dotSize={6}
                            reverse={false}
                        />
                    </div>
                )}

                {reverseCanvasVisible && (
                    <div className="absolute inset-0">
                        <CanvasRevealEffect
                            animationSpeed={4}
                            containerClassName="bg-black"
                            colors={[[255, 255, 255], [180, 180, 180]]}
                            dotSize={6}
                            reverse={true}
                        />
                    </div>
                )}

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.8)_0%,_transparent_100%)]" />
                <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col flex-1">
                {/* Back Button */}
                <div className="p-6">
                    <button
                        onClick={handleBackClick}
                        className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>{step === "email" ? "Back to home" : "Back"}</span>
                    </button>
                </div>

                {/* Form Container */}
                <div className="flex-1 flex flex-col justify-center items-center px-6">
                    <div className="w-full max-w-sm">
                        <AnimatePresence mode="wait">
                            {step === "email" ? (
                                <motion.div
                                    key="email-step"
                                    initial={{ opacity: 0, x: -100 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="space-y-6 text-center"
                                >
                                    {/* Logo */}
                                    <div className="flex justify-center mb-4">
                                        <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-700 flex items-center justify-center shadow-lg shadow-black/50">
                                            <Shield className="h-8 w-8 text-white" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <h1 className="text-3xl font-bold tracking-tight text-white">Welcome to Harmony Aura</h1>
                                        <p className="text-lg text-gray-500 font-light">Supervisor Portal</p>
                                    </div>

                                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                                        <div className="relative">
                                            <input
                                                type="email"
                                                placeholder="supervisor@company.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-white/5 backdrop-blur-sm text-white border border-white/10 rounded-full py-3 px-6 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 text-center transition-all placeholder:text-gray-600"
                                                required
                                            />
                                            <button
                                                type="submit"
                                                className="absolute right-1.5 top-1.5 text-white w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors group overflow-hidden"
                                            >
                                                <span className="relative w-full h-full block overflow-hidden">
                                                    <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-full">→</span>
                                                    <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 -translate-x-full group-hover:translate-x-0">→</span>
                                                </span>
                                            </button>
                                        </div>
                                    </form>

                                    <p className="text-xs text-gray-600 pt-8">
                                        Access restricted to authorized supervisors only.<br />
                                        Contact admin for credentials.
                                    </p>
                                </motion.div>
                            ) : step === "password" ? (
                                <motion.div
                                    key="password-step"
                                    initial={{ opacity: 0, x: 100 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 100 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="space-y-6 text-center"
                                >
                                    <div className="space-y-1">
                                        <h1 className="text-3xl font-bold tracking-tight text-white">Enter Password</h1>
                                        <p className="text-base text-gray-500 font-light">{email}</p>
                                    </div>

                                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                        <div className="relative">
                                            <input
                                                type="password"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-white/5 backdrop-blur-sm text-white border border-white/10 rounded-full py-3 px-6 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 text-center transition-all placeholder:text-gray-600"
                                                required
                                                autoFocus
                                            />
                                        </div>

                                        {error && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-red-400 text-sm"
                                            >
                                                {error}
                                            </motion.p>
                                        )}

                                        <div className="flex gap-3 pt-2">
                                            <motion.button
                                                type="button"
                                                onClick={handleBackClick}
                                                className="rounded-full bg-white/10 text-white font-medium px-6 py-3 hover:bg-white/20 transition-colors flex-shrink-0"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                Back
                                            </motion.button>
                                            <motion.button
                                                type="submit"
                                                disabled={isLoading || password.length < 4}
                                                className={cn(
                                                    "flex-1 rounded-full font-medium py-3 transition-all duration-300",
                                                    password.length >= 4
                                                        ? "bg-white text-black hover:bg-gray-200"
                                                        : "bg-white/5 text-gray-600 cursor-not-allowed"
                                                )}
                                                whileHover={password.length >= 4 ? { scale: 1.02 } : {}}
                                                whileTap={password.length >= 4 ? { scale: 0.98 } : {}}
                                            >
                                                {isLoading ? "Signing in..." : "Sign In"}
                                            </motion.button>
                                        </div>
                                    </form>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="success-step"
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
                                    className="space-y-6 text-center"
                                >
                                    <div className="space-y-1">
                                        <h1 className="text-3xl font-bold tracking-tight text-white">Welcome Back!</h1>
                                        <p className="text-base text-gray-500 font-light">Redirecting to dashboard...</p>
                                    </div>

                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.5, delay: 0.5 }}
                                        className="py-10"
                                    >
                                        <div className="mx-auto w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg shadow-white/10">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 text-center">
                    <p className="text-xs text-gray-700">Powered by OverClocked</p>
                </div>
            </div>
        </div>
    );
};

export default SmartSiteSignIn;
