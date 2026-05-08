import { create } from 'zustand'

export interface User {
  id: string;
  username: string;
  role: string;
}

export interface Product {
  id: string;
  barcode: string;
  name_en: string;
  name_ar: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: () => number;
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  
  cart: [],
  addToCart: (product) => {
    if (product.stock_quantity <= 0) return; // Out of stock
    const { cart } = get();
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      // Cap quantity at available stock
      if (existing.quantity >= product.stock_quantity) return;
      set({
        cart: cart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        )
      });
    } else {
      set({ cart: [...cart, { product, quantity: 1 }] });
    }
  },
  removeFromCart: (productId) => {
    set({ cart: get().cart.filter(item => item.product.id !== productId) });
  },
  updateCartQuantity: (productId, quantity) => {
    if (quantity <= 0) return get().removeFromCart(productId);
    // Cap at available stock
    const item = get().cart.find(i => i.product.id === productId);
    if (item && quantity > item.product.stock_quantity) {
      quantity = item.product.stock_quantity;
    }
    set({
      cart: get().cart.map(item => 
        item.product.id === productId ? { ...item, quantity } : item
      )
    });
  },
  clearCart: () => set({ cart: [] }),
  cartTotal: () => {
    return get().cart.reduce((total, item) => total + (item.product.selling_price * item.quantity), 0);
  }
}));
