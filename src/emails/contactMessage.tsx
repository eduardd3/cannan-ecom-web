export interface ContactMessageProps {
    name: string
    email: string
    orderNumber?: string
    topic: string
    message: string
    sentAt: string
}

//  Sent to support only, never to the customer. Written to be quoted back to
//  them when support replies, so nothing internal goes in the body; account
//  details travel as headers (see sendContactEmail). Every value is user input
//  and goes in as JSX text, so React escapes it.
export function ContactMessage(props: ContactMessageProps) {
    const details = [
        props.orderNumber ? `Order #${props.orderNumber}` : null,
        props.topic,
        props.sentAt,
    ].filter(Boolean).join(' · ');

    return (
        <div>
            <p>{props.name} ({props.email}) wrote:</p>

            {/* pre-wrap keeps the customer's line breaks. */}
            <p style={{ whiteSpace: 'pre-wrap' }}>{props.message}</p>

            <p><small>{details}</small></p>
        </div>
    )
}
