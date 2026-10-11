import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

interface VerifyAccountProps {
    name: string | null
    url: string
};

export function VerifyAccount({name, url}: VerifyAccountProps) {
    return (
        <div>
            <p>Hello{name ? ` ${name}` : ''},</p>
            <p>
                Let&apos;s finish creating your MyCANN account. Confirm your email
                address by clicking the link below. It expires in 24 hours.
            </p>
            <p>
                <a href={url}>Confirm Email</a>
            </p>
            <p>
                If you did not create a MyCANN account, your email address may have
                been entered by mistake and you can safely disregard this email.
            </p>
            <p>
                If you have any questions or concerns, please contact us
                at <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
            </p>
            <p>
                Thank you,<br />
                The Cannan Store • For you &amp; yours
            </p>
        </div>
    )
}
