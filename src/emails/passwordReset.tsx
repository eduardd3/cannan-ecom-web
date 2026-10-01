interface PasswordResetProps {
    name: string | null
    email: string
    url: string
};

export function PasswordReset({name, email, url}: PasswordResetProps) {
    return (
        <div>
            <p>Hello{name ? ` ${name}` : ''},</p>
            <p>
                We received a request to reset the password for <strong>{email}</strong>.
            </p>
            <p>
                To reset your password, click the link below. It expires in 1 hour.
            </p>
            <p>
                <a href={url}>Reset Password</a>
            </p>
            <p>
                If you did not make this request, your email address may have been
                entered by mistake and you can safely disregard this email.
            </p>
            <p>
                If you have any questions or concerns, please contact us
                at <a href='mailto:support@mail.shopcannan.com'>support@mail.shopcannan.com</a>.
            </p>
            <p>
                Thank you,<br />
                The Cannan Store • For you &amp; yours
            </p>
        </div>
    )
}
