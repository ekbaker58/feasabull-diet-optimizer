import { cn } from "@/lib/utils";

// Feathers the square artwork into the cream background.
const MASK = {
  maskImage: "radial-gradient(closest-side, #000 90%, transparent 100%)",
  WebkitMaskImage: "radial-gradient(closest-side, #000 90%, transparent 100%)",
};

export function Mascot({ src, alt, className = "", rotate = 0, float = "float", round = false }) {
  return (
    <div className={className} style={{ transform: `rotate(${rotate}deg)` }}>
      <div className={cn("h-full w-full", float === "slow" ? "animate-float-slow" : "animate-float")}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={cn("h-full w-full object-contain", round && "rounded-full")}
          style={round ? undefined : MASK}
        />
      </div>
    </div>
  );
}
