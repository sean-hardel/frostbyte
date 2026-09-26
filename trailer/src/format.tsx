import type React from "react";
import { createContext, useContext } from "react";
import { FORMATS, type Durations, type FormatId } from "./brand";

/** Format de la composition en cours (16:9 ou 9:16), partagé par toutes les scènes. */
export type Format = {
  id: FormatId;
  width: number;
  height: number;
  portrait: boolean;
  duration: Durations;
  /** Valeur selon l'orientation : v(paysage, portrait). */
  v<T>(landscape: T, portrait: T): T;
};

function makeFormat(id: FormatId): Format {
  const f = FORMATS[id];
  const portrait = id === "9x16";
  return {
    id,
    width: f.width,
    height: f.height,
    portrait,
    duration: f.duration,
    v: (landscape, port) => (portrait ? port : landscape),
  };
}

const FormatContext = createContext<Format>(makeFormat("16x9"));

export const FormatProvider: React.FC<{ id: FormatId; children: React.ReactNode }> = ({ id, children }) => (
  <FormatContext.Provider value={makeFormat(id)}>{children}</FormatContext.Provider>
);

export const useFormat = () => useContext(FormatContext);
