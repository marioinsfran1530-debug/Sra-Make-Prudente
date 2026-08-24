import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Trocas e Devoluções | Sra Make Prudente",
  description:
    "Consulte as regras de trocas, devoluções, direito de arrependimento e produtos com defeito da Sra Make Prudente.",
  alternates: {
    canonical: "https://sramakeprudente.com.br/politica-de-trocas-e-devolucoes",
  },
};

export default function PoliticaTrocasDevolucoesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 text-texto sm:py-12">
      <h1 className="text-2xl font-bold sm:text-3xl">Política de Trocas e Devoluções</h1>
      <p className="mt-3 text-sm leading-6 text-cinza">
        Esta política estabelece as condições para trocas e devoluções de produtos adquiridos na Sra Make Prudente, respeitando a legislação brasileira aplicável às relações de consumo.
      </p>

      <div className="mt-8 space-y-7 text-sm leading-7">
        <section>
          <h2 className="text-lg font-semibold">1. Direito de arrependimento</h2>
          <p className="mt-2">
            Nas compras realizadas fora do estabelecimento comercial, inclusive por meio do nosso catálogo online e atendimento à distância, o cliente poderá exercer o direito de arrependimento no prazo de até 7 (sete) dias corridos, contado do recebimento do produto, nos termos do artigo 49 do Código de Defesa do Consumidor.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Condições para devolução por arrependimento</h2>
          <p className="mt-2">
            Para solicitar a devolução, entre em contato conosco dentro do prazo informado acima. O produto deverá ser devolvido com todos os itens, acessórios e componentes recebidos. Sempre que possível, conserve também a embalagem original. A análise das condições do produto não limita os direitos assegurados ao consumidor pela legislação aplicável.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Produtos com defeito, avaria ou divergência</h2>
          <p className="mt-2">
            Caso o produto apresente defeito, avaria, divergência em relação ao pedido ou outro problema coberto pela legislação de consumo, entre em contato conosco para que possamos orientar o atendimento e aplicar a solução adequada, incluindo troca, substituição, restituição ou outra medida prevista em lei, conforme o caso.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Trocas</h2>
          <p className="mt-2">
            Aceitamos solicitações de troca. As condições serão avaliadas conforme o motivo da solicitação, as características do produto e os direitos previstos na legislação brasileira. Produtos com defeito ou enviados incorretamente terão tratamento conforme as garantias legais aplicáveis.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Custos da devolução</h2>
          <p className="mt-2">
            Quando a devolução decorrer do exercício regular do direito de arrependimento ou de problema cuja responsabilidade seja da loja, os procedimentos e eventuais custos de devolução serão tratados de acordo com a legislação aplicável. O cliente receberá as orientações necessárias no atendimento.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Reembolso</h2>
          <p className="mt-2">
            Quando houver direito ao reembolso, a restituição dos valores será providenciada após o processamento da solicitação, observando a forma de pagamento utilizada e os prazos operacionais aplicáveis, sem prejuízo dos direitos previstos em lei.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Como solicitar</h2>
          <p className="mt-2">
            Para solicitar troca, devolução ou informar um problema com o pedido, utilize os canais de atendimento disponibilizados pela Sra Make Prudente no catálogo. Informe, sempre que possível, o número ou dados do pedido, o produto envolvido e o motivo da solicitação para agilizar o atendimento.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Atendimento</h2>
          <p className="mt-2">
            Sra Make Prudente — Presidente Prudente/SP. Os dados comerciais e canais de contato atualizados estão disponíveis neste site.
          </p>
        </section>
      </div>

      <p className="mt-10 border-t border-rosa/10 pt-5 text-xs text-cinza">
        Última atualização: 23 de agosto de 2026.
      </p>
    </main>
  );
}
