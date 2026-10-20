import { AppFrame } from "@/ui/shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
