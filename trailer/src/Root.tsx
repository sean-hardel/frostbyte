import type React from "react";
import { Composition } from "remotion";
import { FPS, HEIGHT, TOTAL, WIDTH } from "./brand";
import { Trailer } from "./Trailer";

export const Root: React.FC = () => (
  <Composition id="Trailer" component={Trailer} durationInFrames={TOTAL} fps={FPS} width={WIDTH} height={HEIGHT} />
);
