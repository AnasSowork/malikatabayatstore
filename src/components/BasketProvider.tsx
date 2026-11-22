"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { basketLineId, BASKET_MAX_LINES, type CartItem } from "@/lib/basket";

const STORAGE_KEY = "nira-basket-v1";

type BasketContextValue = {
  items: CartItem[];
  count: number;
  ready: boolean;
  addItem: (item: Omit<CartItem, "id">) => void;
  setQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

const BasketContext = createContext<BasketContextValue | null>(null);

function readStoredBasket(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartItem).slice(0, BASKET_MAX_LINES);
  } catch {
    return [];
  }
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.id === "string" &&
    typeof item.productId === "string" &&
    typeof item.name === "string" &&
    typeof item.unitPrice === "number" &&
    typeof item.quantity === "number" &&
    item.quantity >= 1 &&
    typeof item.size === "string" &&
    typeof item.maxQuantity === "number"
  );
}

export function BasketProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readStoredBasket());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<BasketContextValue>(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    return {
      items,
      count,
      ready,
      addItem(item) {
        const id = basketLineId(item);
        setItems((current) => {
          const existing = current.find((line) => line.id === id);
          if (!existing) {
            if (current.length >= BASKET_MAX_LINES) return current;
            const quantity = Math.min(item.maxQuantity, Math.max(1, item.quantity));
            if (quantity < 1 || item.maxQuantity < 1) return current;
            return [...current, { ...item, id, quantity }];
          }
          const quantity = Math.min(existing.maxQuantity, existing.quantity + item.quantity);
          return current.map((line) =>
            line.id === id
              ? {
                  ...line,
                  ...item,
                  id,
                  quantity,
                }
              : line,
          );
        });
      },
      setQuantity(id, quantity) {
        setItems((current) =>
          current.flatMap((line) => {
            if (line.id !== id) return [line];
            const next = Math.floor(quantity);
            if (next < 1) return [];
            return [{ ...line, quantity: Math.min(line.maxQuantity, next) }];
          }),
        );
      },
      removeItem(id) {
        setItems((current) => current.filter((line) => line.id !== id));
      },
      clear() {
        setItems([]);
      },
    };
  }, [items, ready]);

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket() {
  const value = useContext(BasketContext);
  if (!value) throw new Error("useBasket must be used within BasketProvider");
  return value;
}
