"use client";

import { useEffect, useState } from "react";
import type { CartLine } from "@/lib/ordering";

// The basket is kept in this browser only (localStorage), so a reload doesn't empty it.
// It is saved only once something is in it, and removed again when it is empty.

const STORAGE_KEY = "yt-cart";
const MAX_QUANTITY = 20;

function loadCart(): CartLine[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as CartLine[];
    // Lines are checked against the menu later, once it has loaded.
    return saved.filter((line) => typeof line.id === "string" && line.qty > 0);
  } catch {
    return [];
  }
}

function saveCart(cart: CartLine[]) {
  try {
    if (cart.length > 0) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage is blocked (e.g. private mode): the basket still works for this visit.
  }
}

/** Sets the quantity of one dish: 0 removes it, a new dish is added with quantity 1. */
function withQuantity(cart: CartLine[], id: string, quantity: number): CartLine[] {
  if (quantity <= 0) return cart.filter((line) => line.id !== id);

  const exists = cart.some((line) => line.id === id);
  if (!exists) return [...cart, { id, qty: 1 }];

  return cart.map((line) => (line.id === id ? { ...line, qty: Math.min(MAX_QUANTITY, quantity) } : line));
}

export function useStoredCart() {
  const [cart, setCart] = useState<CartLine[]>([]);

  // Read the saved basket after the first render (localStorage doesn't exist on the server).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setCart(loadCart()), []);
  useEffect(() => saveCart(cart), [cart]);

  return {
    cart,
    itemCount: cart.reduce((total, line) => total + line.qty, 0),
    quantityOf: (id: string) => cart.find((line) => line.id === id)?.qty ?? 0,
    setQuantity: (id: string, quantity: number) => setCart((current) => withQuantity(current, id, quantity)),
    /** Removes dishes that can't be ordered any more (deleted, sold out). */
    keepOnly: (isOrderable: (id: string) => boolean) =>
      setCart((current) =>
        current.every((line) => isOrderable(line.id)) ? current : current.filter((line) => isOrderable(line.id)),
      ),
    clear: () => setCart([]),
  };
}
