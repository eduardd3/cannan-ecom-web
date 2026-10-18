//  The one customer-facing support address. Pages link to it with
//  SUPPORT_MAILTO; change it here and every policy page follows.
export const SUPPORT_EMAIL = "support@shopcannan.com";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

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
