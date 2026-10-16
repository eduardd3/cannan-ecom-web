"use client";

import { useState, type ComponentProps } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import TextField from "./text-field";

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, "type" | "endAdornment">;

//  TextField plus a show/hide toggle. The only client state is `visible`.
export default function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeSlashIcon : EyeIcon;

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      endAdornment={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-stone transition-colors hover:text-charcoal focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-antique-gold"
        >
          <Icon aria-hidden="true" className="size-5" />
        </button>
      }
    />
  );
}
