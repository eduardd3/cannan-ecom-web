import type { Appearance, CssFontSource } from "@stripe/stripe-js";

//  Stripe draws its fields inside iframes, which can't read our CSS variables,
//  so the palette is repeated here as hex. Keep these in step with the
//  @theme block in globals.css.
const color = {
    charcoal: "#2B2A28",
    stone: "#6B6862",
    hairline: "#E4E0D9",
    antiqueGold: "#A8874F",
    errorInk: "#7A2820",
    white: "#FFFFFF",
} as const;

//  The iframes load fonts themselves; this is the same DM Sans the page uses.
export const stripeFonts: CssFontSource[] = [
    { cssSrc: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap" },
];

//  Matches the Field component: label 8px above, white 48px field, 1px
//  hairline, 4px corners (the one radius token), stone on hover, antique gold
//  on focus, muted red when invalid. No shadows anywhere.
export const stripeAppearance: Appearance = {
    theme: "stripe",
    variables: {
        fontFamily: "'DM Sans', sans-serif",
        fontSizeBase: "16px",
        borderRadius: "4px",
        colorPrimary: color.charcoal,
        colorText: color.charcoal,
        colorTextSecondary: color.stone,
        colorTextPlaceholder: color.stone,
        colorBackground: color.white,
        colorDanger: color.errorInk,
        gridRowSpacing: "16px",
        gridColumnSpacing: "16px",
    },
    rules: {
        ".Label": { fontSize: "15px", fontWeight: "500", color: color.charcoal, marginBottom: "8px" },
        ".Input": { border: `1px solid ${color.hairline}`, boxShadow: "none", padding: "13px 14px" },
        ".Input:hover": { borderColor: color.stone },
        ".Input:focus": { borderColor: color.antiqueGold, boxShadow: "none" },
        ".Input--invalid": { borderColor: color.errorInk, boxShadow: "none" },
        ".Error": { fontSize: "13px", marginTop: "6px" },
        ".AccordionItem": { border: `1px solid ${color.hairline}`, boxShadow: "none" },
    },
};
