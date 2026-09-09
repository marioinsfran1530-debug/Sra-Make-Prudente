import type { Metadata } from "next";
import CheckoutRecoveryObserver from "@/components/CheckoutRecoveryObserver";

export const metadata: Metadata = {
  title: "Finalizar pedido",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CheckoutRecoveryObserver />
      {children}
    </>
  );
}
