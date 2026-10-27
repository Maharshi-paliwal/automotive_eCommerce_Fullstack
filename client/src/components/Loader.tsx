import { useEffect, useRef } from "react";
import gsap from "gsap";
import { heroSectionData } from "../assets/assets";

interface LoaderProps {
  onComplete: () => void;
}

export default function Loader({ onComplete }: LoaderProps) {
  const overlayRef    = useRef<HTMLDivElement>(null);
  const logoRef       = useRef<HTMLImageElement>(null);
  const titleRef      = useRef<HTMLHeadingElement>(null);
  const trackRef      = useRef<HTMLDivElement>(null);
  const fillRef       = useRef<HTMLDivElement>(null);
  const percentRef    = useRef<HTMLSpanElement>(null);

  useEffect(() => {
   
    const ctx = gsap.context(() => {

    
      gsap.set([logoRef.current, titleRef.current, trackRef.current], {
        opacity: 0,
        y: 20, 
      });
      gsap.set(fillRef.current, {
        scaleX: 0,              
        transformOrigin: "left center", 
      });

      
      const tl = gsap.timeline({
        onComplete: playExitAnimation,
      });

      tl
        .to(logoRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out", 
        })

        
        .to(logoRef.current, {
          rotation: 360,
          duration: 0.7,
          ease: "power1.inOut",
        }, "<0.1")

        
        .to(titleRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: "power2.out",
        }, "-=0.3") 

        
        .to(trackRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
        }, "-=0.1")

       
        .to(fillRef.current, {
          scaleX: 1,
          duration: 1.4,
          ease: "power1.inOut",
        }, "-=0.1")

       
        .to({}, { duration: 0.3 });

      
      const counter = { val: 0 };
      gsap.to(counter, {
        val: 100,
        duration: 1.4,
        delay: 1.2, 
        ease: "power1.inOut",
        onUpdate() {
          if (percentRef.current) {
            percentRef.current.textContent = `${Math.round(counter.val)}%`;
          }
        },
      });

     
      function playExitAnimation() {
        gsap.to(overlayRef.current, {
          opacity: 0,
          duration: 0.5,
          ease: "power1.in",
          onComplete,
        });
      }
    });

    return () => ctx.revert();
  }, [onComplete]);

  return (
    <div
      ref={overlayRef}
      className="loader-overlay"
      role="status"
      aria-label="Loading"
    >
      {/* Gear / logo icon */}
      <img
        ref={logoRef}
        src={heroSectionData.logo}
        alt=""
        className="loader-logo"
      />

      {/* Brand name */}
      <h1 ref={titleRef} className="loader-title">
        TorqueNest
      </h1>

      {/* Progress bar */}
      <div ref={trackRef} className="loader-track">
        <div ref={fillRef} className="loader-fill" />
        <span ref={percentRef} className="loader-percent">0%</span>
      </div>
    </div>
  );
}
