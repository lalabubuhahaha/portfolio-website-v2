export const HERO_PALETTES = [
  {
    id: "roseGold",
    name: "Royal Blue & Pearl",
    ballColor: "#2F69FF",
    token: "royal",
    description:
      "Hyper-distinct cobalt spheres floating in soft white-slate gradients.",
  },
  {
    id: "pinkBlush",
    name: "Rose Blush & Crème",
    ballColor: "#FFC5C2",
    token: "rose",
    description:
      "Sweet candy pinks and juicy strawberry accents in a pearl studio.",
  },
  {
    id: "voltLime",
    name: "Volt Lime & Slate",
    ballColor: "#E1FC03",
    token: "lime",
    description: "Electric neon volt-lime against a clean white-slate horizon.",
  },
  {
    id: "arcticBlue",
    name: "Arctic Sky & Crystal",
    ballColor: "#96E5FF",
    token: "arctic",
    description: "Cool arctic crystal blues with a translucent glass sheen.",
  },
] as const;
export type HeroPaletteId = (typeof HERO_PALETTES)[number]["id"];
export type HeroColor = (typeof HERO_PALETTES)[number]["ballColor"];
export const DEFAULT_HERO_PALETTE: HeroPaletteId = "roseGold";
export function getHeroPalette(id: HeroPaletteId) {
  return HERO_PALETTES.find((palette) => palette.id === id) ?? HERO_PALETTES[0];
}
