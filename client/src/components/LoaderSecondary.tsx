
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { heroSectionData } from "../assets/assets";

interface LoaderSecondaryProps {
  onComplete: () => void;
}

export default function Loader({ onComplete }: LoaderSecondaryProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.4,
        ease: "power1.out",
        onComplete,
      });
    }, 1500);

    return () => {
      window.clearTimeout(timer);
      gsap.killTweensOf(overlayRef.current);
    };
  }, [onComplete]);

  return (
    <div
      ref={overlayRef}
      className="loader-overlay flex flex-col items-center justify-center gap-5"
      role="status"
      aria-label="Loading TorqueNest"
    >
      {/* Spinning logo */}
      <div className="flex size-20 items-center justify-center rounded-full border-4 border-app-amber/25 border-t-app-amber animate-spin">
        <img
          src={heroSectionData.logo}
          alt=""
          className="size-10 object-contain"
        />
      </div>

      {/* Brand name */}
      <h1 className="loader-title">
        TorqueNest
      </h1>

      <p className="text-sm text-app-text-light">
        Getting things ready...
      </p>
    </div>
  );
}
