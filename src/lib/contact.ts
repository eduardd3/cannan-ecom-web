//  The one customer-facing support address. Pages link to it with
//  SUPPORT_MAILTO; change it here and every policy page follows.
export const SUPPORT_EMAIL = "support@shopcannan.com";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

//  Business details shown on the contact and about pages. The address is
//  where CANNAN LLC is registered, not a storefront: Cannan sells online only.
export const BUSINESS_NAME = "CANNAN LLC";
export const BUSINESS_ADDRESS_LINES = ["16172 Manzanita St, Hesperia, CA 92345"] as const;
export const BUSINESS_PHONE = "(760) 278-1901";
//  E.164 form for the tel: link.
export const BUSINESS_PHONE_HREF = "tel:+17602781901";

//  Contact form topics. The form's <select>, the server-side validation and
//  the support email's subject all read this one list.
export const CONTACT_TOPIC_VALUES = ["order-status", "returns", "damaged", "product", "other"] as const;
export type ContactTopic = (typeof CONTACT_TOPIC_VALUES)[number];

export const CONTACT_TOPIC_LABELS: Record<ContactTopic, string> = {
  "order-status": "Order status",
  returns: "Returns and refunds",
  damaged: "Damaged or incorrect item",
  product: "Product question",
  other: "Something else",
};

export const CONTACT_TOPICS = CONTACT_TOPIC_VALUES.map((value) => ({
  value,
  label: CONTACT_TOPIC_LABELS[value],
}));
