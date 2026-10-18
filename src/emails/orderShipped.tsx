import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

export interface OrderShippedProps {
    orderId: number
    shippedOn: string
    name: string | null
    carrier: string
    trackingNumber: string
    trackingUrl: string | null // null when the carrier has no tracking page we link to
    items: { productName: string; variantLabel: string | null; quantity: number }[]
    address: string[]
    orderUrl: string
}

const CELL = { padding: '4px 12px 4px 0', verticalAlign: 'top' } as const;

export function OrderShipped(props: OrderShippedProps) {
    const { orderId, shippedOn, name, items, address } = props;
    return (
        <div>
            <p>Hello{name ? ` ${name}` : ''},</p>
            <p>
                Good news: order #{orderId} shipped on {shippedOn}.
            </p>

            <p>
                <strong>Carrier</strong><br />
                {props.carrier}
            </p>
            <p>
                <strong>Tracking number</strong><br />
                <span style={{ fontFamily: 'monospace' }}>{props.trackingNumber}</span>
            </p>
            {props.trackingUrl && (
                <p>
                    <a href={props.trackingUrl}>Track your package</a>
                </p>
            )}

            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
                <tbody>
                    {items.map((item, i) => (
                        <tr key={i}>
                            <td style={CELL}>
                                {item.productName}
                                {item.variantLabel ? <><br /><small>{item.variantLabel}</small></> : null}
                            </td>
                            <td style={CELL}>× {item.quantity}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {address.length > 0 && (
                <p>
                    <strong>Shipping to</strong><br />
                    {address.map((line, i) => <span key={i}>{line}<br /></span>)}
                </p>
            )}

            <p>
                You can check this order any time on <a href={props.orderUrl}>its order page</a>.
            </p>
            <p>
                If you have any questions about your order, please contact us
                at <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
            </p>
            <p>
                Thank you,<br />
                The Cannan Store • For you &amp; yours
            </p>
        </div>
    )
}
