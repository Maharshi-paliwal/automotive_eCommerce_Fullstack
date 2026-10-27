import { useEffect, useRef } from "react";
import gsap from "gsap";

const SVG_CLS = "w-full h-full overflow-visible";

/**
 * Brakes 

 */
export function BrakeAnim() {
  const rotorRef = useRef<SVGGElement>(null);
  const leftPadRef = useRef<SVGGElement>(null);
  const rightPadRef = useRef<SVGGElement>(null);
  const caliperRef = useRef<SVGGElement>(null);
  const fluidRef = useRef<SVGCircleElement>(null);
  const labelRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(rotorRef.current, { opacity: 0, scaleY: 0.7, transformOrigin: "150px 106px" });
      gsap.set(leftPadRef.current, { opacity: 0, x: -18 });
      gsap.set(rightPadRef.current, { opacity: 0, x: 18 });
      gsap.set(caliperRef.current, { opacity: 0, y: -12 });
      gsap.set(fluidRef.current, { opacity: 0, scale: 0.5, svgOrigin: "150 45" });
      gsap.set(labelRef.current, { opacity: 0, y: 6 });

      gsap.timeline()
        .to(rotorRef.current, { opacity: 1, scaleY: 1, duration: 0.45, ease: "power2.out" })
        .to(caliperRef.current, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, "-=0.1")
        .to([leftPadRef.current, rightPadRef.current], { opacity: 1, x: 0, duration: 0.35, stagger: 0.08, ease: "power3.out" }, "-=0.08")
        .to(labelRef.current, { opacity: 0.72, y: 0, duration: 0.3 }, "-=0.05");

      const clamp = gsap.timeline({ repeat: -1, repeatDelay: 0.45, yoyo: true });
      clamp
        .to(leftPadRef.current, { x: 7, duration: 0.55, ease: "power2.inOut" }, 0)
        .to(rightPadRef.current, { x: -7, duration: 0.55, ease: "power2.inOut" }, 0)
        .to(fluidRef.current, { opacity: 0.8, scale: 1.15, duration: 0.25, ease: "power2.out" }, 0.08);
      gsap.to(rotorRef.current, { rotation: 3, duration: 0.8, repeat: -1, yoyo: true, ease: "sine.inOut", transformOrigin: "150px 106px" });
      gsap.to(fluidRef.current, { opacity: 0.2, duration: 0.45, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 0.4 });
    });
    return () => ctx.revert();
  }, []);

  return (
    <svg viewBox="0 0 320 230" className={SVG_CLS} aria-hidden="true">
      <defs>
        <linearGradient id="brakeRotorMetal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#294555" />
          <stop offset="45%" stopColor="#D8E3E9" />
          <stop offset="70%" stopColor="#6E8795" />
          <stop offset="100%" stopColor="#213846" />
        </linearGradient>
        <linearGradient id="brakeCaliperMetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F6C66F" />
          <stop offset="100%" stopColor="#C77A16" />
        </linearGradient>
      </defs>

      {/* Hydraulic line and pressure pulse */}
      <path d="M155 42 V57 H214" fill="none" stroke="#54758B" strokeWidth="4" strokeLinecap="round" />
      <circle ref={fluidRef} cx="214" cy="57" r="6" fill="#F0A52B" />
      <path d="M214 57 H244 V75" fill="none" stroke="#F0A52B" strokeWidth="2" strokeDasharray="4 5" opacity="0.8" />

      {/* Rotor shown as a broad, slim disc in side view */}
      <g ref={rotorRef}>
        <rect x="139" y="65" width="42" height="91" rx="7" fill="url(#brakeRotorMetal)" stroke="#A9BBC5" strokeWidth="2" />
        <path d="M148 72 V149 M158 72 V149 M169 72 V149" stroke="#233B49" strokeWidth="2" opacity="0.85" />
        <path d="M143 78 H177 M143 92 H177 M143 106 H177 M143 120 H177 M143 134 H177" stroke="#E5EDF1" strokeWidth="1.5" opacity="0.65" />
      </g>

      {/* Floating caliper bracket */}
      <g ref={caliperRef}>
        <path d="M118 69 H136 V151 H118 Q105 151 105 138 V83 Q105 69 118 69 Z"
          fill="#24445F" stroke="#6F8B9D" strokeWidth="3" />
        <path d="M184 69 H202 Q215 69 215 83 V138 Q215 151 202 151 H184 Z"
          fill="#24445F" stroke="#6F8B9D" strokeWidth="3" />
        <path d="M118 69 H202" stroke="#8FA7B5" strokeWidth="5" strokeLinecap="round" />
      </g>

      {/* Pads squeeze toward the disc */}
      <g ref={leftPadRef}>
        <rect x="121" y="83" width="13" height="55" rx="3" fill="url(#brakeCaliperMetal)" stroke="#F6C66F" strokeWidth="1.5" />
        <path d="M125 90 V131" stroke="#FFF0CF" strokeWidth="1.5" opacity="0.75" />
      </g>
      <g ref={rightPadRef}>
        <rect x="186" y="83" width="13" height="55" rx="3" fill="url(#brakeCaliperMetal)" stroke="#F6C66F" strokeWidth="1.5" />
        <path d="M190 90 V131" stroke="#FFF0CF" strokeWidth="1.5" opacity="0.75" />
      </g>

      {/* Force arrows */}
      <g fill="none" stroke="#F0A52B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M74 104 H101 M92 96 L101 104 L92 112" />
        <path d="M246 104 H219 M228 96 L219 104 L228 112" />
      </g>
      <path d="M36 177 H284" stroke="#355D7A" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 185 H96 M112 185 H156 M172 185 H216 M232 185 H268" stroke="#F0A52B" strokeWidth="2.5" strokeLinecap="round" />
      <text ref={labelRef} x="160" y="211" textAnchor="middle" fill="#F0A52B" fontSize="10" letterSpacing="2.4" fontFamily="Outfit, sans-serif">BRAKE PRESSURE</text>
    </svg>
  );
}

/**
 * Engine — three simple pistons moving out of phase above a crankshaft.
 * The repeating movement is readable at carousel size and avoids tiny details.
 */
export function EngineAnim() {
  const piston1Ref = useRef<SVGGElement>(null);
  const piston2Ref = useRef<SVGGElement>(null);
  const piston3Ref = useRef<SVGGElement>(null);
  const crankRef = useRef<SVGGElement>(null);
  const rodsRef = useRef<SVGGElement>(null);
  const labelRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const pistons = [piston1Ref.current, piston2Ref.current, piston3Ref.current];
      gsap.set(pistons, { opacity: 0, y: -12 });
      gsap.set(crankRef.current, { opacity: 0, rotation: -12, svgOrigin: "150 157" });
      gsap.set(rodsRef.current, { opacity: 0 });
      gsap.set(labelRef.current, { opacity: 0, y: 6 });

      gsap.timeline()
        .to(pistons, { opacity: 1, y: 0, duration: 0.35, stagger: 0.1, ease: "back.out(1.4)" })
        .to(rodsRef.current, { opacity: 1, duration: 0.25 }, "-=0.1")
        .to(crankRef.current, { opacity: 1, rotation: 0, duration: 0.35, ease: "power2.out" }, "-=0.1")
        .to(labelRef.current, { opacity: 0.72, y: 0, duration: 0.3 }, "-=0.05");

      gsap.to(piston1Ref.current, { y: 13, duration: 0.72, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(piston2Ref.current, { y: -10, duration: 0.72, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 0.36 });
      gsap.to(piston3Ref.current, { y: 13, duration: 0.72, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 0.18 });
      gsap.to(crankRef.current, { rotation: 360, duration: 1.2, repeat: -1, ease: "none", svgOrigin: "150 157" });
    });
    return () => ctx.revert();
  }, []);

  const cylinders = [78, 150, 222];

  return (
    <svg viewBox="0 0 320 230" className={SVG_CLS} aria-hidden="true">
      <defs>
        <linearGradient id="engineBlock" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D9E4E9" />
          <stop offset="48%" stopColor="#607D8D" />
          <stop offset="100%" stopColor="#263E4B" />
        </linearGradient>
      </defs>

      {/* Cylinder block */}
      <path d="M48 48 Q48 39 58 39 H262 Q272 39 272 48 V132 H48 Z"
        fill="#132A37" stroke="#54758B" strokeWidth="3" />
      {cylinders.map((x) => (
        <g key={x}>
          <rect x={x - 25} y="48" width="50" height="78" rx="5" fill="#0D202B" stroke="#6C8796" strokeWidth="2" />
          <path d={`M${x - 18} 56 V117 M${x + 18} 56 V117`} stroke="#355D7A" strokeWidth="2" />
        </g>
      ))}

      {/* Pistons */}
      {[piston1Ref, piston2Ref, piston3Ref].map((ref, index) => (
        <g key={index} ref={ref}>
          <rect x={cylinders[index] - 21} y="70" width="42" height="22" rx="3" fill="url(#engineBlock)" stroke="#F0A52B" strokeWidth="2" />
          <path d={`M${cylinders[index] - 16} 76 H${cylinders[index] + 16} M${cylinders[index] - 16} 82 H${cylinders[index] + 16} M${cylinders[index] - 16} 88 H${cylinders[index] + 16}`}
            stroke="#1A3544" strokeWidth="1.5" />
        </g>
      ))}

      {/* Connecting rods */}
      <g ref={rodsRef} stroke="#F0A52B" strokeWidth="5" strokeLinecap="round">
        <path d="M78 96 L82 147 M150 96 L150 147 M222 96 L218 147" />
      </g>

      {/* Crankshaft: simple rotating offset journals */}
      <g ref={crankRef}>
        <path d="M52 157 H268" stroke="#7F99A7" strokeWidth="9" strokeLinecap="round" />
        {[82, 150, 218].map((x, i) => (
          <g key={x}>
            <circle cx={x} cy={157} r="16" fill="#203A49" stroke="#F0A52B" strokeWidth="3" />
            <circle cx={x + (i === 1 ? 0 : 4)} cy={157} r="5" fill="#DCE6EB" />
          </g>
        ))}
        <path d="M58 157 H242" stroke="#DCE6EB" strokeWidth="2" opacity="0.7" />
      </g>

      <path d="M34 184 H286" stroke="#355D7A" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 192 H90 M106 192 H148 M164 192 H206 M222 192 H272" stroke="#F0A52B" strokeWidth="2.5" strokeLinecap="round" />
      <text ref={labelRef} x="160" y="216" textAnchor="middle" fill="#8FA7B5" fontSize="10" letterSpacing="2.4" fontFamily="Outfit, sans-serif">PISTON CYCLE</text>
    </svg>
  );
}

/**
 * Suspension — a single clean shock absorber with a compressing coil and
 * moving lower mount. Side arrows make the compression action obvious.
 */
export function SuspensionAnim() {
  const springRef = useRef<SVGPathElement>(null);
  const lowerMountRef = useRef<SVGGElement>(null);
  const damperRef = useRef<SVGRectElement>(null);
  const arrowsRef = useRef<SVGGElement>(null);
  const labelRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(springRef.current, { opacity: 0, scaleY: 0.72, svgOrigin: "150 110" });
      gsap.set(lowerMountRef.current, { opacity: 0, y: 12 });
      gsap.set(damperRef.current, { opacity: 0, scaleY: 0.65, transformOrigin: "150px 110px" });
      gsap.set(arrowsRef.current, { opacity: 0 });
      gsap.set(labelRef.current, { opacity: 0, y: 6 });

      gsap.timeline()
        .to(damperRef.current, { opacity: 1, scaleY: 1, duration: 0.4, ease: "power2.out" })
        .to(springRef.current, { opacity: 1, scaleY: 1, duration: 0.45, ease: "back.out(1.4)" }, "-=0.15")
        .to(lowerMountRef.current, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, "-=0.1")
        .to(arrowsRef.current, { opacity: 0.85, duration: 0.25 }, "-=0.05")
        .to(labelRef.current, { opacity: 0.72, y: 0, duration: 0.3 }, "-=0.05");

      const compression = gsap.timeline({ repeat: -1, yoyo: true, repeatDelay: 0.2 });
      compression
        .to(springRef.current, { scaleY: 0.78, duration: 0.8, ease: "sine.inOut", svgOrigin: "150 110" }, 0)
        .to(lowerMountRef.current, { y: -10, duration: 0.8, ease: "sine.inOut" }, 0)
        .to(damperRef.current, { scaleY: 0.9, duration: 0.8, ease: "sine.inOut" }, 0)
        .to(arrowsRef.current, { y: -3, duration: 0.8, ease: "sine.inOut" }, 0);
    });
    return () => ctx.revert();
  }, []);

  return (
    <svg viewBox="0 0 320 230" className={SVG_CLS} aria-hidden="true">
      <defs>
        <linearGradient id="suspensionShaft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#24445F" />
          <stop offset="48%" stopColor="#E1E9ED" />
          <stop offset="100%" stopColor="#355D7A" />
        </linearGradient>
      </defs>

      {/* Top mount */}
      <path d="M128 36 H172 L180 47 H120 Z" fill="#F0A52B" stroke="#F6C66F" strokeWidth="2" />
      <circle cx="139" cy="42" r="3" fill="#17303D" />
      <circle cx="161" cy="42" r="3" fill="#17303D" />

      {/* Damper body and shaft */}
      <rect ref={damperRef} x="139" y="49" width="22" height="117" rx="8" fill="url(#suspensionShaft)" stroke="#8FA7B5" strokeWidth="2" />
      <path d="M150 48 V180" stroke="#DCE6EB" strokeWidth="3" opacity="0.75" />

      {/* Spring wraps around the damper */}
      <path ref={springRef}
        d="M122 57 L178 68 L122 79 L178 90 L122 101 L178 112 L122 123 L178 134 L122 145 L178 156 L150 166"
        fill="none" stroke="#F0A52B" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />

      <g ref={lowerMountRef}>
        <rect x="119" y="165" width="62" height="13" rx="4" fill="#355D7A" stroke="#8FA7B5" strokeWidth="2" />
        <path d="M132 178 V191 H168 V178" fill="#24445F" stroke="#8FA7B5" strokeWidth="2" />
        <circle cx="150" cy="191" r="5" fill="#F0A52B" />
      </g>

      {/* Compression arrows */}
      <g ref={arrowsRef} fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M83 69 V112 M75 78 L83 68 L91 78 M75 103 L83 113 L91 103" stroke="#F0A52B" />
        <path d="M217 112 V69 M209 103 L217 113 L225 103 M209 78 L217 68 L225 78" stroke="#8FA7B5" />
      </g>
      <path d="M38 202 H282" stroke="#355D7A" strokeWidth="3" strokeLinecap="round" />
      <path d="M55 210 H99 M115 210 H159 M175 210 H219 M235 210 H265" stroke="#F0A52B" strokeWidth="2.5" strokeLinecap="round" />
      <text ref={labelRef} x="160" y="227" textAnchor="middle" fill="#D58A12" fontSize="9" letterSpacing="2" fontFamily="Outfit, sans-serif">SHOCK ABSORPTION</text>
    </svg>
  );
}

export function WheelAnim() {
  const wheelRef = useRef<SVGGElement>(null);
  const spokesRef = useRef<SVGGElement>(null);
  const roadDashesRef = useRef<SVGGElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const labelRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(wheelRef.current, {
        opacity: 0,
        x: -18,
        scale: 0.88,
        svgOrigin: "126 105",
      });
      gsap.set(spokesRef.current, { opacity: 0, scale: 0.75, svgOrigin: "126 105" });
      gsap.set(roadDashesRef.current, { opacity: 0, x: 22 });
      gsap.set(glowRef.current, { opacity: 0, scale: 0.8, svgOrigin: "126 105" });
      gsap.set(labelRef.current, { opacity: 0, y: 8 });

      const intro = gsap.timeline();
      intro
        .to(wheelRef.current, {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.6,
          ease: "power3.out",
        })
        .to(spokesRef.current, {
          opacity: 1,
          scale: 1,
          duration: 0.35,
          ease: "power2.out",
        }, "-=0.2")
        .to(glowRef.current, { opacity: 0.5, scale: 1, duration: 0.35, ease: "power2.out" }, "-=0.1")
        .to(roadDashesRef.current, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }, "-=0.1")
        .to(labelRef.current, { opacity: 0.75, y: 0, duration: 0.35 }, "-=0.05");

      // Rotate the complete upright wheel around its true SVG centre.
      // Rotating the full wheel keeps the spokes attached to the rim instead
      // of letting them drift off into the separate star-like shape.
      gsap.to(wheelRef.current, {
        rotation: 360,
        duration: 4.5,
        repeat: -1,
        ease: "none",
        svgOrigin: "126 105",
      });

      // Subtle rotating rim highlight reinforces the wheel's motion.
      gsap.to(glowRef.current, {
        rotation: 360,
        duration: 10,
        repeat: -1,
        ease: "none",
        svgOrigin: "126 105",
      });

      gsap.to(roadDashesRef.current, {
        x: -24,
        duration: 0.8,
        repeat: -1,
        ease: "none",
        modifiers: {
          x: (value) => `${parseFloat(value) % 24}px`,
        },
      });
    });

    return () => ctx.revert();
  }, []);

  // Five broad, sculpted spokes (not eight narrow rays) for a recognisable rim.
  const spokeAngles = Array.from({ length: 5 }, (_, i) => i * 72);

  return (
    <svg viewBox="0 0 320 220" className={SVG_CLS} aria-hidden="true">
      <defs>
        <linearGradient id="wheelTire" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#526D7D" />
          <stop offset="48%" stopColor="#142733" />
          <stop offset="100%" stopColor="#496576" />
        </linearGradient>
        <linearGradient id="wheelRim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F0C16B" />
          <stop offset="45%" stopColor="#F0A52B" />
          <stop offset="100%" stopColor="#8B5218" />
        </linearGradient>
      </defs>

      {/* Upright tyre sits on a road line; dashes move beneath it. */}
      <path d="M12 177 H308" stroke="#355D7A" strokeWidth="4" strokeLinecap="round" />
      <g ref={roadDashesRef} stroke="#F0A52B" strokeWidth="3" strokeLinecap="round">
        {Array.from({ length: 7 }, (_, i) => (
          <line key={i} x1={12 + i * 48} y1="188" x2={34 + i * 48} y2="188" />
        ))}
      </g>

      {/* Keep the halo separate from the wheel; no rotating star graphic. */}
      <circle
        ref={glowRef}
        cx="126"
        cy="105"
        r="80"
        fill="none"
        stroke="#F0A52B"
        strokeWidth="1.5"
        strokeDasharray="3 9"
        opacity="0.4"
      />

      <g ref={wheelRef}>
        {/* Tyre sidewall and tread grooves */}
        <circle cx="126" cy="105" r="72" fill="#0A1720" stroke="#526D7D" strokeWidth="12" />
        <circle cx="126" cy="105" r="67" fill="none" stroke="#718A99" strokeWidth="2" strokeDasharray="5 4" />
        <circle cx="126" cy="105" r="59" fill="url(#wheelTire)" stroke="#8CA1AD" strokeWidth="2" />

        {/* Rim face */}
        <circle cx="126" cy="105" r="50" fill="#152C39" stroke="#F0A52B" strokeWidth="3" />
        <circle cx="126" cy="105" r="43" fill="none" stroke="#8FA7B5" strokeWidth="2" opacity="0.8" />

        <g ref={spokesRef}>
          {spokeAngles.map((angle) => (
            <g key={angle} transform={`rotate(${angle} 126 105)`}>
              <path
                d="M121 65 L131 65 L139 99 L132 105 L120 99 Z"
                fill="url(#wheelRim)"
                stroke="#F7C66F"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path d="M126 68 L128 95" stroke="#FFF0CF" strokeWidth="1.2" opacity="0.65" />
            </g>
          ))}
        </g>

        {/* Stationary-looking centre cap is part of the wheel and rotates with it */}
        <circle cx="126" cy="105" r="17" fill="#203A49" stroke="#F0A52B" strokeWidth="3" />
        <circle cx="126" cy="105" r="7" fill="#DDE6EB" stroke="#F0A52B" strokeWidth="2" />
      </g>

      {/* Motion ticks are restrained and stay clear of the tyre */}
      <g stroke="#8FA7B5" strokeWidth="2.5" strokeLinecap="round" opacity="0.85">
        <path d="M218 72 H252 M226 84 H270 M218 126 H250" />
      </g>
      <text ref={labelRef} x="235" y="151" textAnchor="middle" fill="#F0A52B" fontSize="10" letterSpacing="2" fontFamily="Outfit, sans-serif">
        WHEELS &amp; TYRES
      </text>
    </svg>
  );
}



export function ElectricalAnim() {
  const sparkRef = useRef<SVGGElement>(null);
  const plugRef = useRef<SVGGElement>(null);
  const labelRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(plugRef.current, {
        opacity: 0,
        y: 12,
        scale: 0.85,
  svgOrigin: "160 115",
      });

      gsap.set(sparkRef.current, {
        opacity: 0,
        scale: 0.7,
        svgOrigin: "160 45",
      });

      gsap.set(labelRef.current, {
        opacity: 0,
        y: 5,
      });

      // Initial entrance animation
     gsap.timeline()
  .to(plugRef.current, {
    opacity: 1,
    y: 0,
    scale: 1.2,
    duration: 0.6,
    ease: "back.out(1.4)",
  })
  .to(
    labelRef.current,
    {
      opacity: 0.75,
      y: 0,
      duration: 0.3,
    },
    "-=0.1"
  );

      // Brief, crisp ignition discharge
      gsap.to(sparkRef.current, {
        opacity: 1,
        scale: 1.5,
        duration: 0.16,
        repeat: -1,
        repeatDelay: 1.1,
        yoyo: true,
        ease: "power2.out",
      });

      // Gentle movement of the spark plug
      gsap.to(plugRef.current, {
        y: -3,
        duration: 1.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <svg
      viewBox="0 0 320 230"
      className={SVG_CLS}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="ignitionMetal"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
        >
          <stop offset="0%" stopColor="#355D7A" />
          <stop offset="45%" stopColor="#E1E9ED" />
          <stop offset="100%" stopColor="#54758B" />
        </linearGradient>
      </defs>

      {/* Sharp amber ignition bolt */}
      <g ref={sparkRef}>
        <path
          d="M160 37 L153 48 L162 47 L155 60 L169 43 L160 45 L166 37"
          fill="#F0A52B"
          stroke="#FFF0CF"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Small red electrical sparks */}
        <path
          d="M145 43 L139 39 M175 43 L181 39 M160 29 V24"
          fill="none"
          stroke="#EF4444"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Spark plug */}
      <g ref={plugRef}>
        <rect
          x="139"
          y="76"
          width="42"
          height="23"
          rx="5"
          fill="url(#ignitionMetal)"
          stroke="#8FA7B5"
          strokeWidth="2"
        />

        <path
          d="M143 82 H177 M143 89 H177"
          stroke="#24445F"
          strokeWidth="2.5"
        />

        <path
          d="M145 99 V123 L151 130 H169 L175 123 V99 Z"
          fill="#DCE6EB"
          stroke="#54758B"
          strokeWidth="2"
        />

        <path
          d="M150 105 H170 M150 111 H170 M150 117 H170"
          stroke="#54758B"
          strokeWidth="2"
        />

        <rect
          x="151"
          y="130"
          width="18"
          height="35"
          rx="3"
          fill="#E1E9ED"
          stroke="#54758B"
          strokeWidth="2"
        />

        <path
          d="M154 135 H166 M154 141 H166 M154 147 H166"
          stroke="#54758B"
          strokeWidth="2"
        />

        <path
          d="M156 165 V179 L160 184 L164 179 V165"
          fill="#F0A52B"
          stroke="#C77A16"
          strokeWidth="2"
        />
      </g>

      {/* Electrical circuit */}
      <path
        d="M43 194 H277"
        stroke="#355D7A"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <path
        d="M60 202 H105 M120 202 H160 M175 202 H215 M230 202 H260"
        stroke="#EF4444"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <text
        ref={labelRef}
        x="160"
        y="222"
        textAnchor="middle"
        fill="#F0A52B"
        fontSize="10"
        letterSpacing="2"
        fontFamily="Outfit, sans-serif"
      >
        IGNITION SYSTEM
      </text>
    </svg>
  );
}



export function MaintenanceAnim() {
  const bottleRef = useRef<SVGGElement>(null);
  const dropRef = useRef<SVGPathElement>(null);
  const shineRef = useRef<SVGPathElement>(null);
  const labelRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(bottleRef.current, { opacity: 0, y: 12 });
      gsap.set(dropRef.current, { opacity: 0, y: -8 });
      gsap.set(shineRef.current, { opacity: 0 });
      gsap.set(labelRef.current, { opacity: 0, y: 5 });

      gsap.timeline()
        .to(bottleRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power3.out",
        })
        .to(
          shineRef.current,
          { opacity: 0.8, duration: 0.35 },
          "-=0.1"
        )
        .to(labelRef.current, {
          opacity: 0.75,
          y: 0,
          duration: 0.3,
        });

      gsap.to(dropRef.current, {
        opacity: 1,
        y: 12,
        duration: 0.9,
        repeat: -1,
        repeatDelay: 0.35,
        ease: "power1.in",
      });

      gsap.to(shineRef.current, {
        opacity: 0.25,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(bottleRef.current, {
        y: -2,
        duration: 1.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <svg viewBox="0 0 320 230" className={SVG_CLS} aria-hidden="true">
      <defs>
        <linearGradient id="oilBottle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="48%" stopColor="#B91C1C" />
          <stop offset="100%" stopColor="#64151B" />
        </linearGradient>

        <linearGradient id="oilLabel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#DCE6EB" />
        </linearGradient>
      </defs>

      {/* Floating oil drop */}
      <path
        ref={dropRef}
        d="M226 55 C226 55 214 70 214 77 A12 12 0 0 0 238 77 C238 70 226 55 226 55 Z"
        fill="#F0A52B"
        stroke="#C77A16"
        strokeWidth="1.5"
      />

      {/* Oil bottle */}
      <g ref={bottleRef}>
        <path d="M124 64 H154 V80 L166 94 V105 H191
          Q202 105 202 117 V177 Q202 187 192 187 H108
          Q98 187 98 177 V117 Q98 105 109 105 H116 V94 L124 80 Z"
          fill="url(#oilBottle)"
          stroke="#8E2424"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Bottle cap */}
        <rect x="121" y="48" width="36" height="17" rx="3"
          fill="#24445F" stroke="#54758B" strokeWidth="2" />
        <path d="M127 53 H151 M127 58 H151"
          stroke="#8FA7B5" strokeWidth="1.5" />

        {/* Front label */}
        <rect x="109" y="119" width="82" height="49" rx="5"
          fill="url(#oilLabel)" />

        <path d="M109 119 H191 V130 H109 Z" fill="#F0A52B" />

        <text x="150" y="145" textAnchor="middle"
          fill="#142B3B" fontSize="11" fontWeight="700">
          ENGINE OIL
        </text>

        <text x="150" y="158" textAnchor="middle"
          fill="#64748B" fontSize="8" letterSpacing="1">
          PERFORMANCE
        </text>

        {/* Bottle handle */}
        <path d="M126 69 H145 V80 L137 91 H126"
          fill="none" stroke="#F87171" strokeWidth="3"
          strokeLinejoin="round" />

        {/* Moving highlight */}
        <path
          ref={shineRef}
          d="M108 121 V174"
          stroke="#FCA5A5"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {/* Base */}
      <path d="M38 194 H282" stroke="#355D7A" strokeWidth="3"
        strokeLinecap="round" />
      <path d="M58 202 H100 M117 202 H159 M176 202 H218 M235 202 H262"
        stroke="#F0A52B" strokeWidth="2.5" strokeLinecap="round" />

      <text ref={labelRef} x="160" y="222" textAnchor="middle"
        fill="#EF4444" fontSize="10" letterSpacing="2"
        fontFamily="Outfit, sans-serif">
        CARE &amp; MAINTENANCE
      </text>
    </svg>
  );
}

