import { StoreProvider } from "@/lib/store";

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <StoreProvider>{children}</StoreProvider>;
}
