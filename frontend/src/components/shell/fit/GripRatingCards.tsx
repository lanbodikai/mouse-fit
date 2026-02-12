"use client";

import Image from "next/image";
import type { GripRatings } from "@/lib/types";

type GripKey = keyof GripRatings;

type GripCard = {
  key: GripKey;
  label: string;
  hint: string;
  image: string;
};

const CARDS: GripCard[] = [
  {
    key: "palm",
    label: "Palm Grip",
    hint: "Full palm contact, relaxed fingers.",
    image: "/projects/grip.png",
  },
  {
    key: "claw",
    label: "Claw Grip",
    hint: "Arched fingers with a stable rear contact.",
    image: "/projects/measure.png",
  },
  {
    key: "fingertip",
    label: "Fingertip Grip",
    hint: "Only fingertips contact the shell.",
    image: "/projects/rapid.png",
  },
];

type GripRatingCardsProps = {
  value: GripRatings;
  onChange: (next: GripRatings) => void;
};

export default function GripRatingCards({ value, onChange }: GripRatingCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {CARDS.map((card) => (
        <article
          key={card.key}
          className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur"
        >
          <div className="relative h-36 w-full">
            <Image
              src={card.image}
              alt={card.label}
              fill
              className="object-cover opacity-80"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          <div className="space-y-3 p-4">
            <div>
              <h3 className="text-sm font-semibold text-white">{card.label}</h3>
              <p className="mt-1 text-xs text-white/60">{card.hint}</p>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = value[card.key] === n;
                return (
                  <button
                    key={`${card.key}-${n}`}
                    type="button"
                    onClick={() => onChange({ ...value, [card.key]: n })}
                    className={`h-9 w-9 rounded-full border text-xs font-semibold transition ${
                      active
                        ? "border-green-400 bg-green-400/20 text-green-300"
                        : "border-white/20 bg-white/5 text-white/70 hover:border-white/40"
                    }`}
                    aria-label={`${card.label} score ${n}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
