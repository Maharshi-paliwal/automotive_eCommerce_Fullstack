// import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
// import gsap from "gsap";
// import { ArrowRightIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
// import { Link } from "react-router-dom";
// import { carouselSlides as SLIDES } from "../../assets/assets";
// import { BrakeAnim, EngineAnim, SuspensionAnim, WheelAnim } from "./SlideAnimations";

// // One animation per slide (same order as carouselSlides in assets.ts)
// const ANIM_COMPONENTS = [BrakeAnim, EngineAnim, SuspensionAnim, WheelAnim];
// const SPEC_LABELS = ["Brake pressure", "Piston cycle", "Shock absorption", "Wheels & tyres"];

// const N = SLIDES.length;
// const DURATION = 6; // seconds each slide stays on screen
// const pad = (n: number) => String(n).padStart(2, "0");

// const prefersReduced =
//   typeof window !== "undefined" &&
//   window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// // Slow zoom-out on the active photo; lasts a bit longer than the slide so it never stalls
// const kenBurns = (el: HTMLElement | null | undefined, from = 1.08) => {
//   if (!el || prefersReduced) return;
//   gsap.fromTo(el, { scale: from }, { scale: 1, duration: DURATION + 2, ease: "none" });
// };

// // Button drifts toward the cursor, springs back on leave
// function useMagnet(ref: { current: HTMLElement | null }, strength = 0.3) {
//   useEffect(() => {
//     const el = ref.current;
//     if (!el || prefersReduced) return;
//     const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.5)" });
//     const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.5)" });
//     const move = (e: MouseEvent) => {
//       const r = el.getBoundingClientRect();
//       xTo((e.clientX - (r.left + r.width / 2)) * strength);
//       yTo((e.clientY - (r.top + r.height / 2)) * strength);
//     };
//     const leave = () => { xTo(0); yTo(0); };
//     el.addEventListener("mousemove", move);
//     el.addEventListener("mouseleave", leave);
//     return () => {
//       el.removeEventListener("mousemove", move);
//       el.removeEventListener("mouseleave", leave);
//       gsap.set(el, { x: 0, y: 0 });
//     };
//   }, [ref, strength]);
// }

// const Carousel = () => {
//   const [current, setCurrent] = useState(0);

//   const rootRef = useRef<HTMLDivElement>(null);
//   const textColRef = useRef<HTMLDivElement>(null);
//   const photoWrapRef = useRef<HTMLDivElement>(null);
//   const photoRefs = useRef<(HTMLImageElement | null)[]>([]);
//   const segRefs = useRef<(HTMLSpanElement | null)[]>([]);
//   const numRef = useRef<HTMLSpanElement>(null);
//   const ctaRef = useRef<HTMLAnchorElement>(null);

//   // Refs hold values GSAP callbacks need without going stale
//   const currentRef = useRef(0);
//   const prevRef = useRef(0);
//   const animating = useRef(false);
//   const hovering = useRef(false);
//   const progressRef = useRef<gsap.core.Tween | null>(null);

//   const slide = SLIDES[current];
//   const AnimComp = ANIM_COMPONENTS[current];

//   useMagnet(ctaRef);

//   // ── Navigate: text exits first, then state changes and the intro plays ────
//   const goTo = useCallback((i: number) => {
//     if (animating.current || i === currentRef.current) return;
//     animating.current = true;
//     progressRef.current?.kill();

//     const commit = () => {
//       currentRef.current = i;
//       setCurrent(i);
//     };
//     const els = rootRef.current?.querySelectorAll(".hero-out");
//     if (prefersReduced || !els?.length) {
//       commit();
//       return;
//     }
//     gsap.to(els, {
//       opacity: 0,
//       y: -14,
//       duration: 0.28,
//       stagger: 0.04,
//       ease: "power2.in",
//       onComplete: commit,
//     });
//   }, []);

//   const step = (dir: number) => goTo((currentRef.current + dir + N) % N);

//   // ── Text intro: tag, split headline, sub, buttons, chips, spec chip ───────
//   useLayoutEffect(() => {
//     if (prefersReduced) {
//       gsap.set(".hero-out", { opacity: 1, y: 0, clearProps: "transform" });
//       animating.current = false;
//       return;
//     }
//     const ctx = gsap.context(() => {
//       gsap.set(".hero-h2", { opacity: 1, y: 0 });
//       const tl = gsap.timeline({
//         defaults: { ease: "power3.out" },
//         onComplete: () => { animating.current = false; },
//       });
//       tl.fromTo(".hero-tag", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 }, 0.05)
//         .fromTo(".hero-word", { yPercent: 115 }, { yPercent: 0, duration: 0.85, stagger: 0.07 }, 0.12)
//         .fromTo(".hero-sub", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6 }, 0.45)
//         .fromTo(".hero-cta", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6 }, 0.6)
//         .fromTo(".hero-chips", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6 }, 0.72)
//         .fromTo(
//           ".hero-chipcard",
//           { opacity: 0, y: 18, scale: 0.92 },
//           { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.6)" },
//           0.8
//         );
//       if (numRef.current) {
//         tl.fromTo(numRef.current, { yPercent: 100 }, { yPercent: 0, duration: 0.5 }, 0.1);
//       }
//     }, rootRef);
//     return () => ctx.revert();
//   }, [current]);

//   // ── Photo layer: clip-path wipe in, then Ken Burns. Not in the context above
//   //    because reverting it would reset the photos mid-transition. ───────────
//   useEffect(() => {
//     const photos = photoRefs.current;
//     const inc = photos[current];
//     const prev = prevRef.current;
//     const out = photos[prev];
//     gsap.killTweensOf(photos);

//     if (prev === current) {
//       kenBurns(inc); // first mount
//     } else if (prefersReduced) {
//       gsap.set(inc, { opacity: 1, zIndex: 2 });
//       gsap.to(out, { opacity: 0, duration: 0.4, onComplete: () => { gsap.set(out, { zIndex: 1 }); } });
//     } else {
//       gsap.set(inc, { zIndex: 3, opacity: 1, clipPath: "inset(0 0 0 100%)", scale: 1.18 });
//       gsap.to(inc, {
//         clipPath: "inset(0 0 0 0%)",
//         scale: 1.06,
//         duration: 1.1,
//         ease: "power3.inOut",
//         onComplete: () => {
//           gsap.set(out, { opacity: 0, zIndex: 1 });
//           gsap.set(inc, { zIndex: 2, clearProps: "clipPath" });
//           kenBurns(inc, 1.06);
//         },
//       });
//     }
//     prevRef.current = current;
//   }, [current]);

//   // ── Progress: one tween per segment is the single source of truth for
//   //    auto-advance, so the bar and the slide change can never drift apart ───
//   useEffect(() => {
//     segRefs.current.forEach((seg, i) => {
//       if (seg) gsap.set(seg, { scaleX: i < current ? 1 : 0 });
//     });
//     const seg = segRefs.current[current];
//     if (!seg) return;
//     const t = gsap.to(seg, {
//       scaleX: 1,
//       duration: DURATION,
//       delay: 0.9, // let the intro finish first
//       ease: "none",
//       onComplete: () => goTo((current + 1) % N),
//     });
//     progressRef.current = t;
//     if (hovering.current) t.pause();
//     return () => { t.kill(); };
//   }, [current, goTo]);

//   // ── Mouse parallax: photo drifts opposite the cursor, text drifts with it ─
//   useEffect(() => {
//     const root = rootRef.current;
//     const photoWrap = photoWrapRef.current;
//     const textCol = textColRef.current;
//     if (!root || !photoWrap || !textCol || prefersReduced) return;

//     const opts = { duration: 0.9, ease: "power3" };
//     const px = gsap.quickTo(photoWrap, "x", opts);
//     const py = gsap.quickTo(photoWrap, "y", opts);
//     const tx = gsap.quickTo(textCol, "x", opts);

//     const move = (e: MouseEvent) => {
//       const r = root.getBoundingClientRect();
//       const nx = (e.clientX - r.left) / r.width - 0.5;
//       const ny = (e.clientY - r.top) / r.height - 0.5;
//       px(-nx * 28);
//       py(-ny * 18);
//       tx(nx * 8);
//     };
//     const leave = () => { px(0); py(0); tx(0); };

//     root.addEventListener("mousemove", move);
//     root.addEventListener("mouseleave", leave);
//     return () => {
//       root.removeEventListener("mousemove", move);
//       root.removeEventListener("mouseleave", leave);
//       gsap.set([photoWrap, textCol], { x: 0, y: 0 });
//     };
//   }, []);

//   const pause = () => { hovering.current = true; progressRef.current?.pause(); };
//   const resume = () => { hovering.current = false; progressRef.current?.resume(); };

//   return (
//     <div
//       ref={rootRef}
//       role="region"
//       aria-roledescription="carousel"
//       aria-label="Featured categories"
//       onMouseEnter={pause}
//       onMouseLeave={resume}
//       onFocus={pause}
//       onBlur={resume}
//       className="relative h-[480px] w-full select-none overflow-hidden rounded-2xl bg-[#0A1016] md:h-[520px]"
//     >
//       {/* Photos: stacked, GSAP decides which one is visible */}
//       <div ref={photoWrapRef} aria-hidden="true" className="absolute -inset-4 z-0">
//         {SLIDES.map((s, i) => (
//           <img
//             key={i}
//             ref={(el) => { photoRefs.current[i] = el; }}
//             src={s.BgImg}
//             alt=""
//             className="absolute inset-0 h-full w-full object-cover object-right will-change-transform"
//             style={{ opacity: i === 0 ? 1 : 0, zIndex: i === 0 ? 2 : 1 }}
//           />
//         ))}
//       </div>

//       {/* One gradient direction: dark behind the text, clear on the photo */}
//       <div
//         aria-hidden="true"
//         className="pointer-events-none absolute inset-0 z-10"
//         style={{
//           background:
//             "linear-gradient(90deg, rgba(10,16,22,0.98) 0%, rgba(10,16,22,0.9) 40%, rgba(10,16,22,0.15) 100%)",
//         }}
//       />
//       <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-[#0A1016]/50 lg:hidden" />

//       {/* Text column */}
//       <div
//         ref={textColRef}
//         aria-live="off"
//         className="relative z-20 flex h-full flex-col items-start justify-center gap-5 px-8 pb-16 md:px-16 lg:w-[58%]"
//       >
//         <span
//           className="hero-tag hero-out inline-flex rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
//           style={{
//             background: slide.accent + "22",
//             color: slide.accent,
//             border: `1px solid ${slide.accent}66`,
//           }}
//         >
//           {slide.tag}
//         </span>

//         <h2
//           className="hero-h2 hero-out max-w-xl font-bold leading-[1.06] text-white"
//           style={{ fontSize: "clamp(2rem, 3.6vw, 3.4rem)" }}
//           aria-label={slide.headline}
//         >
//           {slide.headline.split(" ").map((w, i) => (
//             <span
//               key={`${current}-${i}`}
//               aria-hidden="true"
//               className="mr-[0.25em] inline-block overflow-hidden pb-[0.12em] align-bottom"
//             >
//               <span className="hero-word inline-block">{w}</span>
//             </span>
//           ))}
//         </h2>

//         <p className="hero-sub hero-out max-w-md text-[17px] leading-relaxed text-white/70">
//           {slide.sub}
//         </p>

//         <div className="hero-cta hero-out flex flex-wrap gap-3 pt-1">
//           <Link
//             ref={ctaRef}
//             to={slide.to}
//             className="inline-flex min-h-12 items-center gap-2.5 rounded-full px-7 text-[15px] font-semibold text-[#101820] transition-[filter] hover:brightness-110"
//             style={{ background: slide.accent }}
//           >
//             {slide.cta} <ArrowRightIcon className="size-4" />
//           </Link>
//           <Link
//             to="/products"
//             className="inline-flex min-h-12 items-center rounded-full border border-white/30 px-6 text-[15px] font-medium text-white transition-colors hover:bg-white/10"
//           >
//             View all parts
//           </Link>
//         </div>

//         <div className="hero-chips hero-out flex flex-wrap gap-2.5 pt-1.5">
//           {["Same-day dispatch", "Every part certified"].map((label) => (
//             <span
//               key={label}
//               className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 text-[13px] text-white/80"
//             >
//               <CheckIcon className="size-3.5" style={{ color: slide.accent }} />
//               {label}
//             </span>
//           ))}
//         </div>
//       </div>

//       {/* Your SVG animation, shrunk to a live-spec chip (labels hidden: the chip has its own) */}
//       <div className="hero-chipcard hero-out absolute bottom-24 right-8 z-20 hidden items-center gap-3 rounded-2xl border border-white/15 bg-[#0F1A22]/80 py-3 pl-3 pr-5 backdrop-blur-md md:right-16 lg:flex">
//         <div key={current} aria-hidden="true" className="h-16 w-24 [&_text]:hidden">
//           <AnimComp />
//         </div>
//         <div className="flex flex-col gap-0.5">
//           <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: slide.accent }}>
//             Live spec
//           </span>
//           <span className="text-[15px] font-medium text-white">{SPEC_LABELS[current]}</span>
//         </div>
//       </div>

//       {/* One control row: counter, segmented progress, arrows */}
//       <div className="absolute bottom-5 left-8 right-8 z-30 flex items-center gap-6 md:left-16 md:right-16">
//         <span className="flex items-center gap-1 text-xs tabular-nums tracking-widest text-white/70">
//           <span className="inline-block h-[1.3em] overflow-hidden leading-[1.3em]">
//             <span ref={numRef} className="block">{pad(current + 1)}</span>
//           </span>
//           <span>/ {pad(N)}</span>
//         </span>

//         <div className="flex w-56 gap-2 md:w-72">
//           {SLIDES.map((_, i) => (
//             <button
//               key={i}
//               onClick={() => goTo(i)}
//               aria-label={`Go to slide ${i + 1}`}
//               aria-current={i === current}
//               className="group flex-1 py-3"
//             >
//               <span className="block h-[3px] overflow-hidden rounded bg-white/25 transition-colors group-hover:bg-white/40">
//                 <span
//                   ref={(el) => { segRefs.current[i] = el; }}
//                   className="block h-full origin-left scale-x-0"
//                   style={{ background: slide.accent }}
//                 />
//               </span>
//             </button>
//           ))}
//         </div>

//         <div className="ml-auto flex gap-2.5">
//           <button
//             onClick={() => step(-1)}
//             aria-label="Previous slide"
//             className="flex size-11 items-center justify-center rounded-full border border-white/30 bg-[#0A1016]/50 text-white transition-colors hover:bg-white/15"
//           >
//             <ChevronLeftIcon className="size-[18px]" />
//           </button>
//           <button
//             onClick={() => step(1)}
//             aria-label="Next slide"
//             className="flex size-11 items-center justify-center rounded-full border border-white/30 bg-[#0A1016]/50 text-white transition-colors hover:bg-white/15"
//           >
//             <ChevronRightIcon className="size-[18px]" />
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Carousel;

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowRightIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { carouselSlides as SLIDES } from "../../assets/assets";

const N = SLIDES.length;
const DURATION = 5; // seconds per slide, same as the original timeout bar
const pad = (n: number) => String(n).padStart(2, "0");

// Tuning knobs for the background motion: raise a value for more, lower for less
const M = {
  parallaxX: 48,   // px the photo moves against the cursor (horizontal)
  parallaxY: 30,   // px the photo moves against the cursor (vertical)
  textShift: 10,   // px the text drifts with the cursor
  zoom: 1.12,      // Ken Burns start scale (settles to 1 over the slide)
  wipeFrom: 1.35,  // scale the new photo starts at when it wipes in
  driftX: 14,      // idle sway, px
  driftY: 10,
  driftRot: 0.6,   // idle sway, degrees
  shake: 1,        // impact shake when a new photo lands (0 = off, 2 = violent)
};

const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Slow zoom-out on the active photo; runs a bit longer than the slide so it never stalls
const kenBurns = (el: HTMLElement | null | undefined) => {
  if (!el || prefersReduced) return;
  gsap.fromTo(el, { scale: M.zoom }, { scale: 1, duration: DURATION + 2, ease: "none" });
};

const Carousel = () => {
  const [current, setCurrent] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const textColRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null); // layer 1: follows the mouse
  const driftRef = useRef<HTMLDivElement>(null);    // layer 2: idle sway
  const shakeRef = useRef<HTMLDivElement>(null);    // layer 3: impact shake
  const photoRefs = useRef<(HTMLImageElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement>(null);

  const currentRef = useRef(0);
  const prevRef = useRef(0);
  const busy = useRef(false);

  const slide = SLIDES[current];

  const goTo = useCallback((i: number) => {
    if (busy.current || i === currentRef.current) return;
    busy.current = true;
    currentRef.current = i;
    setCurrent(i);
  }, []);

  const prev = () => goTo((currentRef.current - 1 + N) % N);
  const next = () => goTo((currentRef.current + 1) % N);

  // ── Photo layer: wipe in, impact shake, then Ken Burns ────────────────────
  useEffect(() => {
    const photos = photoRefs.current;
    const inc = photos[current];
    const from = prevRef.current;
    const out = photos[from];
    gsap.killTweensOf(photos);

    if (from === current) {
      kenBurns(inc); // first mount
      busy.current = false;
    } else if (prefersReduced) {
      gsap.set(inc, { opacity: 1, zIndex: 2 });
      gsap.to(out, {
        opacity: 0,
        duration: 0.4,
        onComplete: () => { gsap.set(out, { zIndex: 1 }); busy.current = false; },
      });
    } else {
      gsap.set(inc, { zIndex: 3, opacity: 1, clipPath: "inset(0 0 0 100%)", scale: M.wipeFrom });
      gsap.to(inc, {
        clipPath: "inset(0 0 0 0%)",
        scale: M.zoom,
        duration: 1.1,
        ease: "power3.inOut",
        onComplete: () => {
          gsap.set(out, { opacity: 0, zIndex: 1 });
          gsap.set(inc, { zIndex: 2, clearProps: "clipPath" });
          kenBurns(inc);
          busy.current = false;
        },
      });

      // Camera shake as the new photo lands: decaying jolts on x, y and rotation
      const shake = shakeRef.current;
      if (shake && M.shake > 0) {
        const k = M.shake;
        gsap.killTweensOf(shake);
        gsap.set(shake, { x: 0, y: 0, rotation: 0 });
        gsap.to(shake, {
          delay: 0.55,
          keyframes: [
            { x: -18 * k, y: 6 * k, rotation: -0.8 * k, duration: 0.07 },
            { x: 14 * k, y: -8 * k, rotation: 0.7 * k, duration: 0.07 },
            { x: -10 * k, y: 5 * k, rotation: -0.5 * k, duration: 0.07 },
            { x: 7 * k, y: -3 * k, rotation: 0.3 * k, duration: 0.08 },
            { x: -3 * k, y: 2 * k, rotation: -0.1 * k, duration: 0.08 },
            { x: 0, y: 0, rotation: 0, duration: 0.14 },
          ],
          ease: "power1.inOut",
        });
      }
    }
    prevRef.current = current;
  }, [current]);

  // ── Idle sway: the photo never sits perfectly still ───────────────────────
  useEffect(() => {
    const el = driftRef.current;
    if (!el || prefersReduced) return;
    const t = gsap.to(el, {
      x: `random(-${M.driftX}, ${M.driftX})`,
      y: `random(-${M.driftY}, ${M.driftY})`,
      rotation: `random(-${M.driftRot}, ${M.driftRot})`,
      duration: 3.2,
      ease: "sine.inOut",
      repeat: -1,
      repeatRefresh: true,
    });
    return () => { t.kill(); gsap.set(el, { x: 0, y: 0, rotation: 0 }); };
  }, []);

  // ── Mouse parallax: photo moves against the cursor, text moves with it ────
  useEffect(() => {
    const root = rootRef.current;
    const photo = parallaxRef.current;
    const text = textColRef.current;
    if (!root || !photo || !text || prefersReduced) return;

    const opts = { duration: 0.9, ease: "power3" };
    const px = gsap.quickTo(photo, "x", opts);
    const py = gsap.quickTo(photo, "y", opts);
    const tx = gsap.quickTo(text, "x", opts);

    const move = (e: MouseEvent) => {
      const r = root.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      px(-nx * M.parallaxX * 2);
      py(-ny * M.parallaxY * 2);
      tx(nx * M.textShift * 2);
    };
    const leave = () => { px(0); py(0); tx(0); };

    root.addEventListener("mousemove", move);
    root.addEventListener("mouseleave", leave);
    return () => {
      root.removeEventListener("mousemove", move);
      root.removeEventListener("mouseleave", leave);
      gsap.set([photo, text], { x: 0, y: 0 });
    };
  }, []);

  // ── Timeout bar (the original one): fills over DURATION, then advances ────
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const t = gsap.fromTo(
      bar,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: DURATION,
        ease: "none",
        transformOrigin: "left center",
        onComplete: () => goTo((current + 1) % N),
      }
    );
    return () => { t.kill(); };
  }, [current, goTo]);

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured categories"
      className="relative h-[480px] w-full select-none overflow-hidden rounded-2xl bg-[#0A1016] md:h-[520px]"
    >
      {/* Photos sit inside three nested layers so mouse, idle sway and shake never fight over the same transform.
          The negative inset hides the edges while the layers move. */}
      <div ref={parallaxRef} aria-hidden="true" className="absolute -inset-20 z-0">
        <div ref={driftRef} className="absolute inset-0">
          <div ref={shakeRef} className="absolute inset-0">
            {SLIDES.map((s, i) => (
              <img
                key={i}
                ref={(el) => { photoRefs.current[i] = el; }}
                src={s.BgImg}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-right will-change-transform"
                style={{ opacity: i === 0 ? 1 : 0, zIndex: i === 0 ? 2 : 1 }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* One gradient direction: dark behind the text, clear on the photo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(90deg, rgba(10,16,22,0.98) 0%, rgba(10,16,22,0.9) 40%, rgba(10,16,22,0.15) 100%)",
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-[#0A1016]/50 lg:hidden" />

      {/* Text column */}
      <div
        ref={textColRef}
        className="relative z-20 flex h-full flex-col items-start justify-center gap-5 px-8 pb-16 md:px-16 lg:w-[58%]"
      >
        <span
          className="inline-flex rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
          style={{
            background: slide.accent + "22",
            color: slide.accent,
            border: `1px solid ${slide.accent}66`,
          }}
        >
          {slide.tag}
        </span>

        <h2
          className="max-w-xl font-bold leading-[1.06] text-white"
          style={{ fontSize: "clamp(2rem, 3.6vw, 3.4rem)" }}
        >
          {slide.headline}
        </h2>

        <p className="max-w-md text-[17px] leading-relaxed text-white/70">{slide.sub}</p>

        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            to={slide.to}
            className="inline-flex min-h-12 items-center gap-2.5 rounded-full px-7 text-[15px] font-semibold text-[#101820] transition-[filter] hover:brightness-110 active:scale-95"
            style={{ background: slide.accent }}
          >
            {slide.cta} <ArrowRightIcon className="size-4" />
          </Link>
          <Link
            to="/products"
            className="inline-flex min-h-12 items-center rounded-full border border-white/30 px-6 text-[15px] font-medium text-white transition-colors hover:bg-white/10"
          >
            View all parts
          </Link>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1.5">
          {["Same-day dispatch", "Every part certified"].map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 text-[13px] text-white/80"
            >
              <CheckIcon className="size-3.5" style={{ color: slide.accent }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Control row: counter, dots, arrows */}
      <div className="absolute bottom-5 left-8 right-8 z-30 flex items-center gap-6 md:left-16 md:right-16">
        <span className="text-xs tabular-nums tracking-widest text-white/70">
          {pad(current + 1)} / {pad(N)}
        </span>

        <div className="flex items-center">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === current}
              className="flex h-11 items-center px-1"
            >
              <span
                className="block h-[7px] rounded-full transition-all duration-300"
                style={{
                  width: i === current ? 20 : 7,
                  background: i === current ? slide.accent : "rgba(255,255,255,0.3)",
                }}
              />
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2.5">
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="flex size-11 items-center justify-center rounded-full border border-white/30 bg-[#0A1016]/50 text-white transition-colors hover:bg-white/15"
          >
            <ChevronLeftIcon className="size-[18px]" />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="flex size-11 items-center justify-center rounded-full border border-white/30 bg-[#0A1016]/50 text-white transition-colors hover:bg-white/15"
          >
            <ChevronRightIcon className="size-[18px]" />
          </button>
        </div>
      </div>

      {/* The original timeout bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 h-[3px] bg-white/10">
        <div ref={barRef} className="h-full origin-left" style={{ background: slide.accent }} />
      </div>
    </div>
  );
};

export default Carousel;