import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

export interface OrderConfirmationProps {
    orderId: number
    placedOn: string
    name: string | null
    items: { productName: string; variantLabel: string | null; quantity: number; lineTotal: string }[]
    subtotal: string
    shipping: string
    tax: string
    total: string
    address: string[]
    //  guest: no account to sign in to, so the link is the order's own
    //  private page instead of "your orders".
    orderLink: { url: string; guest: boolean }
}

const CELL = { padding: '4px 12px 4px 0', verticalAlign: 'top' } as const;
const AMOUNT = { ...CELL, textAlign: 'right', paddingRight: 0 } as const;

export function OrderConfirmation(props: OrderConfirmationProps) {
    const { orderId, placedOn, name, items, address } = props;
    return (
        <div>
            <p>Hello{name ? ` ${name}` : ''},</p>
            <p>
                Thank you for your order. We&apos;ve received order #{orderId}, placed
                on {placedOn}, and we&apos;re getting it ready to ship.
            </p>

            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
                <tbody>
                    {items.map((item, i) => (
                        <tr key={i}>
                            <td style={CELL}>
                                {item.productName}
                                {item.variantLabel ? <><br /><small>{item.variantLabel}</small></> : null}
                            </td>
                            <td style={CELL}>× {item.quantity}</td>
                            <td style={AMOUNT}>{item.lineTotal}</td>
                        </tr>
                    ))}
                    <tr><td style={CELL} colSpan={2}>Subtotal</td><td style={AMOUNT}>{props.subtotal}</td></tr>
                    <tr><td style={CELL} colSpan={2}>Shipping</td><td style={AMOUNT}>{props.shipping}</td></tr>
                    <tr><td style={CELL} colSpan={2}>Tax</td><td style={AMOUNT}>{props.tax}</td></tr>
                    <tr>
                        <td style={CELL} colSpan={2}><strong>Total</strong></td>
                        <td style={AMOUNT}><strong>{props.total}</strong></td>
                    </tr>
                </tbody>
            </table>

            {address.length > 0 && (
                <p>
                    <strong>Shipping to</strong><br />
                    {address.map((line, i) => <span key={i}>{line}<br /></span>)}
                </p>
            )}

            <p>
                {props.orderLink.guest ? (
                    <>You can view your order any time on <a href={props.orderLink.url}>its order page</a>.</>
                ) : (
                    <>You can view your order any time in <a href={props.orderLink.url}>your orders</a>.</>
                )}
            </p>
            <p>
                If you have any questions about your order, please contact us
                at <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
            </p>
            <p>
                Thank you,<br />
                Cannan • For you &amp; yours
            </p>
        </div>
    )
}
