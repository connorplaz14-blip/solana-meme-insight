import { createContext, useContext, useState, type ReactNode } from "react";

type Ctx = { open: boolean; setOpen: (v: boolean) => void; toggle: () => void };
const MobileNavCtx = createContext<Ctx | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileNavCtx.Provider value={{ open, setOpen, toggle: () => setOpen(!open) }}>
      {children}
    </MobileNavCtx.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavCtx);
  if (!ctx) throw new Error("useMobileNav must be used within MobileNavProvider");
  return ctx;
}