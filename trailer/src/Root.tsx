import type React from "react";
import { Composition } from "remotion";
import { FORMATS, FPS, totalFrames } from "./brand";
import { Trailer } from "./Trailer";

/*
  Deux compositions, mêmes scènes :
  - Trailer         : 16:9, 1920 × 1080, 25 s (site)
  - TrailerVertical : 9:16, 1080 × 1920, 15 s (réseaux)
*/
export const Root: React.FC = () => (
  <>
    <Composition
      id="Trailer"
      component={Trailer}
      defaultProps={{ format: "16x9" as const }}
      durationInFrames={totalFrames("16x9")}
      fps={FPS}
      width={FORMATS["16x9"].width}
      height={FORMATS["16x9"].height}
    />
    <Composition
      id="TrailerVertical"
      component={Trailer}
      defaultProps={{ format: "9x16" as const }}
      durationInFrames={totalFrames("9x16")}
      fps={FPS}
      width={FORMATS["9x16"].width}
      height={FORMATS["9x16"].height}
    />
  </>
);
