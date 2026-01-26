"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Shield, ArrowRight } from 'lucide-react';

interface RippleType {
    id: number;
    x: number;
    y: number;
}

const DigitalSerenityLanding = () => {
    const [mouseGradientStyle, setMouseGradientStyle] = useState({
        left: '0px',
        top: '0px',
        opacity: 0,
    });
    const [ripples, setRipples] = useState<RippleType[]>([]);
    const [scrolled, setScrolled] = useState(false);
    const floatingElementsRef = useRef<Element[]>([]);

    useEffect(() => {
        const animateWords = () => {
            const wordElements = document.querySelectorAll('.word-animate');
            wordElements.forEach(word => {
                const delay = parseInt(word.getAttribute('data-delay') || '0');
                setTimeout(() => {
                    if (word) (word as HTMLElement).style.animation = 'word-appear 0.8s ease-out forwards';
                }, delay);
            });
        };
        const timeoutId = setTimeout(animateWords, 500);
        return () => clearTimeout(timeoutId);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMouseGradientStyle({
                left: `${e.clientX}px`,
                top: `${e.clientY}px`,
                opacity: 1,
            });
        };
        const handleMouseLeave = () => {
            setMouseGradientStyle(prev => ({ ...prev, opacity: 0 }));
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const newRipple = { id: Date.now(), x: e.clientX, y: e.clientY };
            setRipples(prev => [...prev, newRipple]);
            setTimeout(() => setRipples(prev => prev.filter(r => r.id !== newRipple.id)), 1000);
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    useEffect(() => {
        const wordElements = document.querySelectorAll('.word-animate');
        const handleMouseEnter = (e: Event) => {
            const target = e.target as HTMLElement;
            if (target) target.style.textShadow = '0 0 20px rgba(255, 255, 255, 0.3)';
        };
        const handleMouseLeave = (e: Event) => {
            const target = e.target as HTMLElement;
            if (target) target.style.textShadow = 'none';
        };
        wordElements.forEach(word => {
            word.addEventListener('mouseenter', handleMouseEnter);
            word.addEventListener('mouseleave', handleMouseLeave);
        });
        return () => {
            wordElements.forEach(word => {
                if (word) {
                    word.removeEventListener('mouseenter', handleMouseEnter);
                    word.removeEventListener('mouseleave', handleMouseLeave);
                }
            });
        };
    }, []);

    useEffect(() => {
        const elements = document.querySelectorAll('.floating-element-animate');
        floatingElementsRef.current = Array.from(elements);
        const handleScroll = () => {
            if (!scrolled) {
                setScrolled(true);
                floatingElementsRef.current.forEach((el, index) => {
                    setTimeout(() => {
                        if (el) {
                            (el as HTMLElement).style.animationPlayState = 'running';
                            (el as HTMLElement).style.opacity = '';
                        }
                    }, (parseFloat((el as HTMLElement).style.animationDelay || "0") * 1000) + index * 100);
                });
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [scrolled]);

    const pageStyles = `
    #mouse-gradient-react {
      position: fixed;
      pointer-events: none;
      border-radius: 9999px;
      background-image: radial-gradient(circle, rgba(255, 255, 255, 0.03), rgba(150, 150, 150, 0.02), transparent 70%);
      transform: translate(-50%, -50%);
      will-change: left, top, opacity;
      transition: left 70ms linear, top 70ms linear, opacity 300ms ease-out;
    }
    @keyframes word-appear { 0% { opacity: 0; transform: translateY(30px) scale(0.8); filter: blur(10px); } 50% { opacity: 0.8; transform: translateY(10px) scale(0.95); filter: blur(2px); } 100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
    @keyframes grid-draw { 0% { stroke-dashoffset: 1000; opacity: 0; } 50% { opacity: 0.3; } 100% { stroke-dashoffset: 0; opacity: 0.15; } }
    @keyframes pulse-glow { 0%, 100% { opacity: 0.1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(1.1); } }
    .word-animate { display: inline-block; opacity: 0; margin: 0 0.1em; transition: color 0.3s ease, transform 0.3s ease; }
    .word-animate:hover { color: #ffffff; transform: translateY(-2px); }
    .grid-line { stroke: #404040; stroke-width: 0.5; opacity: 0; stroke-dasharray: 5 5; stroke-dashoffset: 1000; animation: grid-draw 2s ease-out forwards; }
    .detail-dot { fill: #606060; opacity: 0; animation: pulse-glow 3s ease-in-out infinite; }
    .corner-element-animate { position: absolute; width: 40px; height: 40px; border: 1px solid rgba(255, 255, 255, 0.1); opacity: 0; animation: word-appear 1s ease-out forwards; }
    .text-decoration-animate { position: relative; }
    .text-decoration-animate::after { content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 1px; background: linear-gradient(90deg, transparent, #808080, transparent); animation: underline-grow 2s ease-out forwards; animation-delay: 2s; }
    @keyframes underline-grow { to { width: 100%; } }
    .floating-element-animate { position: absolute; width: 2px; height: 2px; background: #808080; border-radius: 50%; opacity: 0; animation: float 4s ease-in-out infinite; animation-play-state: paused; }
    @keyframes float { 0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; } 25% { transform: translateY(-10px) translateX(5px); opacity: 0.6; } 50% { transform: translateY(-5px) translateX(-3px); opacity: 0.4; } 75% { transform: translateY(-15px) translateX(7px); opacity: 0.8; } }
    .ripple-effect { position: fixed; width: 4px; height: 4px; background: rgba(255, 255, 255, 0.4); border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none; animation: pulse-glow 1s ease-out forwards; z-index: 9999; }
    @keyframes cta-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.2); } 50% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); } }
    .cta-button { animation: cta-pulse 2s ease-in-out infinite; }
  `;

    return (
        <>
            <style>{pageStyles}</style>
            <div className="min-h-screen bg-black text-slate-100 overflow-hidden relative">

                <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <defs>
                        <pattern id="gridReactDarkResponsive" width="60" height="60" patternUnits="userSpaceOnUse">
                            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#gridReactDarkResponsive)" />
                    <line x1="0" y1="20%" x2="100%" y2="20%" className="grid-line" style={{ animationDelay: '0.5s' }} />
                    <line x1="0" y1="80%" x2="100%" y2="80%" className="grid-line" style={{ animationDelay: '1s' }} />
                    <line x1="20%" y1="0" x2="20%" y2="100%" className="grid-line" style={{ animationDelay: '1.5s' }} />
                    <line x1="80%" y1="0" x2="80%" y2="100%" className="grid-line" style={{ animationDelay: '2s' }} />
                    <line x1="50%" y1="0" x2="50%" y2="100%" className="grid-line" style={{ animationDelay: '2.5s', opacity: '0.05' }} />
                    <line x1="0" y1="50%" x2="100%" y2="50%" className="grid-line" style={{ animationDelay: '3s', opacity: '0.05' }} />
                    <circle cx="20%" cy="20%" r="2" className="detail-dot" style={{ animationDelay: '3s' }} />
                    <circle cx="80%" cy="20%" r="2" className="detail-dot" style={{ animationDelay: '3.2s' }} />
                    <circle cx="20%" cy="80%" r="2" className="detail-dot" style={{ animationDelay: '3.4s' }} />
                    <circle cx="80%" cy="80%" r="2" className="detail-dot" style={{ animationDelay: '3.6s' }} />
                    <circle cx="50%" cy="50%" r="1.5" className="detail-dot" style={{ animationDelay: '4s' }} />
                </svg>

                {/* Corner Elements */}
                <div className="corner-element-animate top-4 left-4 sm:top-6 sm:left-6 md:top-8 md:left-8" style={{ animationDelay: '4s' }}>
                    <div className="absolute top-0 left-0 w-2 h-2 bg-white opacity-20 rounded-full"></div>
                </div>
                <div className="corner-element-animate top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8" style={{ animationDelay: '4.2s' }}>
                    <div className="absolute top-0 right-0 w-2 h-2 bg-white opacity-20 rounded-full"></div>
                </div>
                <div className="corner-element-animate bottom-4 left-4 sm:bottom-6 sm:left-6 md:bottom-8 md:left-8" style={{ animationDelay: '4.4s' }}>
                    <div className="absolute bottom-0 left-0 w-2 h-2 bg-white opacity-20 rounded-full"></div>
                </div>
                <div className="corner-element-animate bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8" style={{ animationDelay: '4.6s' }}>
                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-white opacity-20 rounded-full"></div>
                </div>

                <div className="floating-element-animate" style={{ top: '25%', left: '15%', animationDelay: '0.5s' }}></div>
                <div className="floating-element-animate" style={{ top: '60%', left: '85%', animationDelay: '1s' }}></div>
                <div className="floating-element-animate" style={{ top: '40%', left: '10%', animationDelay: '1.5s' }}></div>
                <div className="floating-element-animate" style={{ top: '75%', left: '90%', animationDelay: '2s' }}></div>

                {/* Main Content */}
                <div className="relative z-10 min-h-screen flex flex-col justify-between items-center px-6 py-10 sm:px-8 sm:py-12 md:px-16 md:py-20">

                    {/* Top Section */}
                    <div className="text-center">
                        <h2 className="text-xs sm:text-sm font-mono font-light text-gray-400 uppercase tracking-[0.2em] opacity-80">
                            <span className="word-animate" data-delay="0">Safety</span>
                            <span className="word-animate" data-delay="300">first.</span>
                        </h2>
                        <div className="mt-4 w-12 sm:w-16 h-px bg-gradient-to-r from-transparent via-gray-500 to-transparent opacity-30 mx-auto"></div>
                    </div>

                    {/* Center Content */}
                    <div className="text-center max-w-5xl mx-auto relative">
                        {/* Logo */}
                        <div className="mb-8 opacity-0" style={{ animation: 'word-appear 1s ease-out forwards', animationDelay: '0.3s' }}>
                            <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-700 shadow-lg shadow-black/50">
                                <Shield className="h-10 w-10 text-white" />
                            </div>
                        </div>

                        {/* Main Heading */}
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extralight leading-tight tracking-tight text-white text-decoration-animate">
                            <div className="mb-4 md:mb-6">
                                <span className="word-animate" data-delay="700">Harmony Aura OS</span>
                            </div>
                            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-thin text-gray-400 leading-relaxed tracking-wide">
                                <span className="word-animate" data-delay="1100">AI-Powered</span>
                                <span className="word-animate" data-delay="1250">Construction</span>
                                <span className="word-animate" data-delay="1400">Safety</span>
                                <span className="word-animate" data-delay="1550">&</span>
                                <span className="word-animate" data-delay="1700">Predictive</span>
                                <span className="word-animate" data-delay="1850">Maintenance</span>
                            </div>
                        </h1>

                        {/* CTA Button */}
                        <div className="mt-10 opacity-0" style={{ animation: 'word-appear 1s ease-out forwards', animationDelay: '2.5s' }}>
                            <Link href="/login">
                                <button className="cta-button group relative overflow-hidden bg-white px-8 py-4 rounded-xl text-lg font-semibold text-black transition-all hover:bg-gray-200 hover:scale-105">
                                    <span className="relative z-10 flex items-center gap-2">
                                        Enter Dashboard
                                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                    </span>
                                </button>
                            </Link>
                        </div>

                        {/* Detail Lines */}
                        <div className="absolute -left-6 sm:-left-8 top-1/2 transform -translate-y-1/2 w-3 sm:w-4 h-px bg-gray-500 opacity-0" style={{ animation: 'word-appear 1s ease-out forwards', animationDelay: '3.2s' }}></div>
                        <div className="absolute -right-6 sm:-right-8 top-1/2 transform -translate-y-1/2 w-3 sm:w-4 h-px bg-gray-500 opacity-0" style={{ animation: 'word-appear 1s ease-out forwards', animationDelay: '3.4s' }}></div>
                    </div>

                    {/* Bottom Section */}
                    <div className="text-center">
                        <div className="mb-4 w-12 sm:w-16 h-px bg-gradient-to-r from-transparent via-gray-500 to-transparent opacity-30 mx-auto"></div>
                        <h2 className="text-xs sm:text-sm font-mono font-light text-gray-500 uppercase tracking-[0.2em] opacity-80">
                            <span className="word-animate" data-delay="3000">Monitor.</span>
                            <span className="word-animate" data-delay="3200">Predict.</span>
                            <span className="word-animate" data-delay="3400">Protect.</span>
                        </h2>
                        <div className="mt-6 flex justify-center space-x-4 opacity-0" style={{ animation: 'word-appear 1s ease-out forwards', animationDelay: '4.2s' }}>
                            <div className="w-1 h-1 bg-gray-500 rounded-full opacity-40"></div>
                            <div className="w-1 h-1 bg-gray-400 rounded-full opacity-60"></div>
                            <div className="w-1 h-1 bg-gray-500 rounded-full opacity-40"></div>
                        </div>
                        <p className="mt-4 text-xs text-gray-600 opacity-0" style={{ animation: 'word-appear 1s ease-out forwards', animationDelay: '4.5s' }}>
                            Powered by OverClocked
                        </p>
                    </div>
                </div>

                {/* Mouse Gradient */}
                <div
                    id="mouse-gradient-react"
                    className="w-60 h-60 blur-xl sm:w-80 sm:h-80 sm:blur-2xl md:w-96 md:h-96 md:blur-3xl"
                    style={{
                        left: mouseGradientStyle.left,
                        top: mouseGradientStyle.top,
                        opacity: mouseGradientStyle.opacity,
                    }}
                ></div>

                {ripples.map(ripple => (
                    <div
                        key={ripple.id}
                        className="ripple-effect"
                        style={{ left: `${ripple.x}px`, top: `${ripple.y}px` }}
                    ></div>
                ))}
            </div>
        </>
    );
};

export default DigitalSerenityLanding;
