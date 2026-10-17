import type { ReactNode } from "react";

export type PolicySection = {
  //  Written by hand, never derived from title: other pages link to these
  //  (e.g. /returns#problems-with-your-order), so editing a heading must not
  //  change its id.
  id: string;
  title: string;
  content: ReactNode;
};

//  The related page linked at the bottom, e.g. label "How we handle your
//  information", linkText "Privacy Policy →".
export type PolicyCrossLink = {
  label: string;
  linkText: string;
  href: string;
};
