"use client";

import { useEffect, useState } from "react";

//  How far down the viewport a section's top must pass to become current.
const ACTIVE_LINE = 0.45;
//  Matches scroll-mt-28 / top-28 in the template: the sticky header's height
//  plus a little air, so "fully visible" means visible below the header.
const HEADER_OFFSET_PX = 112;

type Props = {
  items: { id: string; title: string }[];
};

//  The desktop "On this page" list. The only client piece of the policy
//  template: it highlights the section being read.
//
//  IntersectionObserver instead of a scroll listener: the callback runs only
//  when a section crosses the active line, not on every scroll frame, so
//  there is no layout read per frame and nothing to throttle, and it stays
//  correct through resizes and reflow without cached offsets.
export default function ActiveSectionNav({ items }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const sections = items
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const last = sections[sections.length - 1];
    let lastFullyVisible = false;

    //  The current section is the last one whose top has passed the active
    //  line. A short last section (e.g. "Contact") may never reach that line
    //  before the page runs out, so it also wins once it is fully on screen.
    const pick = () => {
      if (lastFullyVisible) {
        setActiveId(last.id);
        return;
      }
      const line = window.innerHeight * ACTIVE_LINE;
      let current: string | null = null;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line) current = section.id;
      }
      setActiveId(current);
    };

    //  Shrinks the observed area to the band above the active line, so a
    //  section's top crossing that line fires the callback.
    const lineObserver = new IntersectionObserver(pick, {
      rootMargin: `0px 0px -${(1 - ACTIVE_LINE) * 100}% 0px`,
    });
    const lastObserver = new IntersectionObserver(
      ([entry]) => {
        lastFullyVisible = entry.isIntersecting;
        pick();
      },
      { rootMargin: `-${HEADER_OFFSET_PX}px 0px 0px 0px`, threshold: 1 },
    );

    sections.forEach((section) => lineObserver.observe(section));
    lastObserver.observe(last);

    return () => {
      lineObserver.disconnect();
      lastObserver.disconnect();
    };
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
              className={`block text-caption transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antique-gold ${
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
