import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

interface ConfirmPasswordReset {
    name: string | null
}

export function ConfirmReset({name} : ConfirmPasswordReset) {
    return (
        <div>
            <p>Hello{name ? ` ${name}` : ''},</p>
            <p>
                Your MyCANN password was just reset, and you were signed out
                everywhere else.
            </p>
            <p>
                If you didn&apos;t do this, please contact us right away
                at <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
            </p>
            <p>
                Thank you,<br />
                The Cannan Store • For you &amp; yours
            </p>
        </div>
    )
}
