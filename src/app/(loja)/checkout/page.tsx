export default function CheckoutPage() {
  return (
    <main className="p-6">
      <h1 className="font-serif font-bold text-xl text-texto">
        Finalizar pedido
      </h1>
      <p className="text-sm text-cinza mt-2">
        Fase 4 do plano: formulário de dados, recebimento, pagamento,
        observação, revisão e envio para{" "}
        <code>POST /api/orders</code>, seguido do redirecionamento para o
        WhatsApp.
      </p>
    </main>
  );
}
