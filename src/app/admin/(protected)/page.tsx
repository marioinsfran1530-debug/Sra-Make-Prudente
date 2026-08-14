export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="font-serif font-bold text-xl text-texto mb-2">
        Dashboard
      </h1>
      <p className="text-sm text-cinza">
        Fase 5 do plano: produtos ativos, pedidos novos, pedidos em
        confirmação, produtos com estoque baixo (calculado a partir de{" "}
        <code>stockQty</code>) e pedidos recentes.
      </p>
    </div>
  );
}
