"use client";

import { useEffect, useState } from "react";

//  1px below where scroll-mt-28 (112px) parks a section after a jump, so the
//  jumped-to section is current and the one above it, which ends at 112px,
//  is not.
const ACTIVE_LINE_PX = 113;

type Props = {
  items: { id: string; title: string }[];
};

//  The desktop "On this page" list. The only client piece of the policy
//  template: it highlights the section being read.
//
//  IntersectionObserver instead of a scroll listener: the callback runs only
//  when a section boundary crosses the active line, not on every scroll
//  frame, so there is no layout read per frame and nothing to throttle, and
//  it stays correct through resizes and reflow without cached offsets.
//
//  The template's sections touch (spacing is inside each one), so the section
//  spanning the line just below the header is the first one, in page order,
//  that still overlaps the area from that line down.
export default function ActiveSectionNav({ items }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const below = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) below.add(entry.target.id);
          else below.delete(entry.target.id);
        }
        setActiveId(items.find(({ id }) => below.has(id))?.id ?? null);
      },
      { rootMargin: `-${ACTIVE_LINE_PX}px 0px 0px 0px` },
    );

    for (const { id } of items) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <ul className="space-y-3 border-l border-hairline/80 pl-4">
      {items.map(({ id, title }) => {
        const active = id === activeId;
        return (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={active ? "location" : undefined}
              className={`block text-caption transition-colors ${
                active ? "text-gold-ink" : "text-stone hover:text-charcoal"
              }`}
            >
              {title}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
