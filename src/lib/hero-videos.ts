export type HeroVideoSource = {
  src: string;
  label: string;
};

/** Placeholder abaya / modest-fashion hero clips (Mixkit, free license). Replace when you have your own footage. */
export const HERO_VIDEOS: HeroVideoSource[] = [
  { src: "/videos/hero/48201.mp4", label: "Woman walking in street" },
  { src: "/videos/hero/49305.mp4", label: "Muslim woman in hijab at the park" },
  { src: "/videos/hero/49314.mp4", label: "Woman in hijab at a café" },
  { src: "/videos/hero/49408.mp4", label: "Hijab fashion portrait" },
  { src: "/videos/hero/49412.mp4", label: "Modest fashion walk" },
];

export const HERO_POSTER = "/api/uploads/p/hero1.jpg";

export function pickHeroVideoIndex(): number {
  return Math.floor(Math.random() * HERO_VIDEOS.length);
}
