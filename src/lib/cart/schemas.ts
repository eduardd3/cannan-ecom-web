import { z } from "zod";

// Per-line ceiling, independent of stock. Stops "quantity: 999999" abuse and
// bulk-buying a limited item out from under everyone else.
export const MAX_QTY_PER_LINE = 10;

export const addToCartSchema = z.object({
    variantId: z.int().positive(),
    quantity: z.int().min(1).max(MAX_QTY_PER_LINE)
});

export const updateQuantitySchema = z.object({
    itemId: z.int().positive(),  //  CartItem id
    quantity: z.int().min(1).max(MAX_QTY_PER_LINE)   
});

export const removeItemSchema = z.object({
    itemId: z.int().positive()
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateQuantityInput = z.infer<typeof updateQuantitySchema>;
export type RemoveItemInput = z.infer<typeof removeItemSchema>;