import { Hub } from "@/core/shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Hub>{children}</Hub>;
}
