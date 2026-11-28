import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OrderConfirmation, type OrderConfirmationProps } from "./orderConfirmation";

const props: Omit<OrderConfirmationProps, "orderLink"> = {
  orderId: 12,
  placedOn: "Nov 27, 2026, 10:00 AM",
  name: "Ana",
  items: [{ productName: "Candle", variantLabel: null, quantity: 1, lineTotal: "$15.00" }],
  subtotal: "$15.00",
  shipping: "$0.00",
  tax: "$0.00",
  total: "$15.00",
  address: ["Ana Buyer", "1 Main St"],
};

const render = (orderLink: OrderConfirmationProps["orderLink"]) =>
  renderToStaticMarkup(createElement(OrderConfirmation, { ...props, orderLink }));

describe("OrderConfirmation link sentence", () => {
  it("points a guest at the order's own page", () => {
    const html = render({ url: "https://example.com/orders/guest/abc", guest: true });
    expect(html).toContain(
      'You can view your order any time on <a href="https://example.com/orders/guest/abc">its order page</a>.',
    );
    expect(html).not.toContain("your orders");
  });

  it("points an account at its orders", () => {
    const html = render({ url: "https://example.com/orders", guest: false });
    expect(html).toContain('You can view your order any time in <a href="https://example.com/orders">your orders</a>.');
    expect(html).not.toContain("its order page");
  });
});
