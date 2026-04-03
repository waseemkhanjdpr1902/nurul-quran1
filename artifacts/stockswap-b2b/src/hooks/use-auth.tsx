import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StockSwapUser, StockSwapShop } from "@workspace/api-client-react/src/generated/api.schemas";

interface AuthState {
  user: StockSwapUser | null;
  shop: StockSwapShop | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: StockSwapUser, token: string, shop?: StockSwapShop | null) => void;
  setShop: (shop: StockSwapShop) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      shop: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token, shop = null) => {
        // We set token in localStorage separately so customFetch can access it easily,
        // or we rely on customFetch reading from Zustand persist store.
        // Actually, custom-fetch usually expects cookies or localStorage "token".
        localStorage.setItem("stockswap_token", token);
        set({ user, token, shop, isAuthenticated: true });
      },
      setShop: (shop) => set({ shop }),
      logout: () => {
        localStorage.removeItem("stockswap_token");
        set({ user: null, shop: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "stockswap-auth",
    }
  )
);
