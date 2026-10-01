interface WelcomeEmailProps {
    name: string | null
}

export function WelcomeEmail({name} : WelcomeEmailProps) {
    return (
        <div>
            <h1>
                Welcome{name ? `, ${name}` : ''}!
            </h1>
        </div>
    )
}
