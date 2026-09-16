import rows from "../../data/freerolls.json";
import type { Freeroll } from "./guide-types";
export const freerolls = rows as Freeroll[];
export const freerollBySlug = (slug: string) => freerolls.find(f => f.slug === slug);
