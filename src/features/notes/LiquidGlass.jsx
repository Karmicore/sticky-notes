import { useEffect, useRef, useState } from "react";
import { displacementMap } from "../../lib/displacementMaps";
import styles from "./styles/LiquidGlass.module.css";

const FILTER_ID = "liquid-glass-filter";

export default function LiquidGlass({ glass, color }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 270, h: 69 });

  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (glass <= 0) return null;

  const ds = 25 * glass;
  const ab = 2 * glass;
  const blur = 4 + glass * 12;
  const sat = 140 + glass * 60;

  return (
    <>
      <svg
        className={styles.svg}
        width={size.w}
        height={size.h}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`${FILTER_ID}-mask`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="black" stopOpacity="0" />
            <stop
              offset={`${Math.max(30, 80 - ab * 2)}%`}
              stopColor="black"
              stopOpacity="0"
            />
            <stop offset="100%" stopColor="white" stopOpacity="1" />
          </radialGradient>
          <filter
            id={FILTER_ID}
            x="-35%"
            y="-35%"
            width="170%"
            height="170%"
            colorInterpolationFilters="sRGB"
          >
            <feImage
              x="0"
              y="0"
              width="100%"
              height="100%"
              result="DM"
              href={displacementMap}
              preserveAspectRatio="xMidYMid slice"
            />
            <feColorMatrix
              in="DM"
              type="matrix"
              values="0.3 0.3 0.3 0 0  0.3 0.3 0.3 0 0  0.3 0.3 0.3 0 0  0 0 0 1 0"
              result="EI"
            />
            <feComponentTransfer in="EI" result="EM">
              <feFuncA type="discrete" tableValues={`0 ${ab * 0.05} 1`} />
            </feComponentTransfer>
            <feOffset in="SourceGraphic" dx="0" dy="0" result="CO" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="DM"
              scale={-ds}
              xChannelSelector="R"
              yChannelSelector="B"
              result="RD"
            />
            <feColorMatrix
              in="RD"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="RC"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="DM"
              scale={-ds * (1 + ab * 0.05)}
              xChannelSelector="R"
              yChannelSelector="B"
              result="GN"
            />
            <feColorMatrix
              in="GN"
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="GC"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="DM"
              scale={-ds * (1 + ab * 0.1)}
              xChannelSelector="R"
              yChannelSelector="B"
              result="BL"
            />
            <feColorMatrix
              in="BL"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              result="BC"
            />
            <feBlend in="GC" in2="BC" mode="screen" result="GB" />
            <feBlend in="RC" in2="GB" mode="screen" result="RGB" />
            <feGaussianBlur
              in="RGB"
              stdDeviation={Math.max(0.1, 0.5 - ab * 0.1)}
              result="BLR"
            />
            <feComposite in="BLR" in2="EM" operator="in" result="ED" />
            <feComponentTransfer in="EM" result="INV">
              <feFuncA type="table" tableValues="1 0" />
            </feComponentTransfer>
            <feComposite in="CO" in2="INV" operator="in" result="CL" />
            <feComposite in="ED" in2="CL" operator="over" />
          </filter>
        </defs>
      </svg>

      {/* Backdrop displacement layer */}
      <div
        ref={containerRef}
        className={styles.backdrop}
        style={{
          filter: `url(#${FILTER_ID})`,
          backdropFilter: `blur(${blur}px) saturate(${sat}%)`,
          opacity: glass,
        }}
      />

      {/* Highlight gradient — top-down light reflection */}
      <div
        className={styles.highlight}
        style={{ opacity: glass * 0.6 }}
      />

      {/* Edge glow — inner border */}
      <div
        className={styles.edgeGlow}
        style={{ opacity: glass * 0.8 }}
      />
    </>
  );
}
