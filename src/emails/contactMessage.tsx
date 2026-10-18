export interface ContactMessageProps {
    name: string
    email: string
    orderNumber?: string
    topic: string
    message: string
    sentAt: string
    //  Present only when the visitor was signed in.
    account?: { userId: string; email: string | null }
}

const CELL = { padding: '4px 16px 4px 0', verticalAlign: 'top' } as const;

//  Sent to support only, never to the customer. Every value is user input and
//  goes in as JSX text, so React escapes it.
export function ContactMessage(props: ContactMessageProps) {
    const rows: [string, string][] = [
        ['Name', props.name],
        ['Email', props.email],
        ['Order number', props.orderNumber ? `#${props.orderNumber}` : '—'],
        ['Topic', props.topic],
        ['Sent', props.sentAt],
    ];
    if (props.account) {
        rows.push(['User id', props.account.userId]);
        rows.push(['Account email', props.account.email ?? '—']);
    }

    return (
        <div>
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
                <tbody>
                    {rows.map(([label, value]) => (
                        <tr key={label}>
                            <td style={CELL}><strong>{label}</strong></td>
                            <td style={CELL}>{value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* pre-wrap keeps the customer's line breaks. */}
            <p style={{ whiteSpace: 'pre-wrap', marginTop: '16px' }}>{props.message}</p>

            <p><small>Reply to this email to answer {props.name} directly.</small></p>
        </div>
    )
}
