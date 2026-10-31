//  The Cannan mark: a five-stone arch with its door swung open, over three
//  steps. Drawn inline with fill="currentColor", so it takes the text color
//  around it (charcoal on linen, gallery white on a dark band) with no second
//  file, and costs no extra request.
//
//  Decorative by default (aria-hidden): wherever it appears, the CANNAN
//  wordmark sits next to it, so a label here would be read twice. Pass a
//  label only where the mark stands alone.
//
//  Size it by height (e.g. className="h-24 w-auto"); the viewBox keeps the
//  proportions. Below ~48px the stone joints and step lines fill in, so the
//  favicon (app/icon.svg) uses a simplified drawing instead.
export default function CannanMark({ className = "", label }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 22 120 172"
      fill="currentColor"
      className={className}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <path d="M14.0 72.0 A46 46 0 0 1 21.6 46.7 L35.0 55.5 A30 30 0 0 0 30.0 72.0 Z M24.0 43.3 A46 46 0 0 1 43.8 28.9 L49.5 43.9 A30 30 0 0 0 36.5 53.3 Z M47.8 27.7 A46 46 0 0 1 72.2 27.7 L68.0 43.1 A30 30 0 0 0 52.0 43.1 Z M76.2 28.9 A46 46 0 0 1 96.0 43.3 L83.5 53.3 A30 30 0 0 0 70.5 43.9 Z M98.4 46.7 A46 46 0 0 1 106.0 72.0 L90.0 72.0 A30 30 0 0 0 85.0 55.5 Z M14 75 H30 V147 H14 Z M90 75 H106 V147 H90 Z M86 144 V66 Q86 51 79 51 Q71 53 69 70 V140 Z M22 147 H98 V154 H22 Z M18 166 Q18 157 27 157 H93 Q102 157 102 166 Z M12 178 Q12 169 21 169 H99 Q108 169 108 178 Z M6 190 Q6 181 15 181 H105 Q114 181 114 190 Z" />
    </svg>
  );
}
