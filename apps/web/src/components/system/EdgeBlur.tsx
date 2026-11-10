/*
 * Progressive blur at a scroller's edges, iOS style: five thin layers, each
 * blurring a little more and covering a little less, so the blur starts at
 * nothing and grows smoothly toward the edge. No tint, no colour: over the soft
 * sky it is invisible, over a passing button it is a gentle melt. Shown only on
 * a side that has more content (data-more-l / data-more-r on the wrapper).
 */
const STEPS = [0.5, 1, 2, 4, 7];

export function EdgeBlur() {
  return (
    <>
      {(["l", "r"] as const).map((side) => (
        <span key={side} aria-hidden className={`edge-blur edge-blur-${side}`}>
          {STEPS.map((b, i) => (
            <span
              key={b}
              style={{
                backdropFilter: `blur(${b}px)`,
                WebkitBackdropFilter: `blur(${b}px)`,
                maskImage: `linear-gradient(${side === "l" ? 270 : 90}deg, transparent ${i * 20}%, #000 ${(i + 1) * 20}%)`,
                WebkitMaskImage: `linear-gradient(${side === "l" ? 270 : 90}deg, transparent ${i * 20}%, #000 ${(i + 1) * 20}%)`,
              }}
            />
          ))}
        </span>
      ))}
    </>
  );
}
