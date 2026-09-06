"use client";

import { useMemo, useState } from "react";

type CustomerOption = { id: string; name: string; phone: string };
type LeadOption = { id: string; customerId: string; stage: string; productName: string | null };

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value;
}

export default function FollowUpTargetPicker({
  customers,
  leads,
  defaultCustomerId = "",
  defaultLeadId = "",
}: {
  customers: CustomerOption[];
  leads: LeadOption[];
  defaultCustomerId?: string;
  defaultLeadId?: string;
}) {
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [leadId, setLeadId] = useState(defaultLeadId);

  const selectedCustomer = customers.find((customer) => customer.id === customerId) || null;

  const filteredCustomers = useMemo(() => {
    const term = normalize(query);
    const phoneTerm = query.replace(/\D/g, "");
    const rows = term
      ? customers.filter((customer) => {
          const matchesName = normalize(customer.name).includes(term);
          const matchesPhone = phoneTerm.length > 0 && customer.phone.replace(/\D/g, "").includes(phoneTerm);
          return matchesName || matchesPhone;
        })
      : customers;
    return rows.slice(0, 10);
  }, [customers, query]);

  const customerLeads = customerId ? leads.filter((lead) => lead.customerId === customerId) : [];

  function selectCustomer(id: string) {
    setCustomerId(id);
    if (!leads.some((lead) => lead.id === leadId && lead.customerId === id)) setLeadId("");
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="customerId" value={customerId} required />
      <input type="hidden" name="leadId" value={leadId} />

      <div>
        <label htmlFor="followup-customer-search" className="text-xs font-bold text-texto">Cliente</label>
        <input
          id="followup-customer-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome ou WhatsApp"
          autoComplete="off"
          className="mt-1 w-full rounded-xl border border-rosa/20 px-3 py-3 text-base outline-none focus:border-rosa-profundo sm:text-sm"
        />

        {selectedCustomer && (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-rosa-profundo/30 bg-rosa/5 px-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-texto">{selectedCustomer.name}</p>
              <p className="mt-0.5 text-[11px] text-cinza">{formatPhone(selectedCustomer.phone)}</p>
            </div>
            <button type="button" onClick={() => { setCustomerId(""); setLeadId(""); }} className="rounded-lg border border-rosa/20 px-2.5 py-1.5 text-[10px] font-bold text-cinza">Trocar</button>
          </div>
        )}

        {!selectedCustomer && (
          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto overscroll-contain">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => selectCustomer(customer.id)}
                className="w-full rounded-xl border border-rosa/10 px-3 py-3 text-left active:bg-creme"
              >
                <p className="text-sm font-bold text-texto">{customer.name}</p>
                <p className="mt-0.5 text-[11px] text-cinza">{formatPhone(customer.phone)}</p>
              </button>
            ))}
            {filteredCustomers.length === 0 && <p className="rounded-xl border border-dashed border-rosa/20 p-5 text-center text-xs text-cinza">Nenhuma cliente encontrada.</p>}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-bold text-texto">Oportunidade relacionada</p>
        {!selectedCustomer ? (
          <p className="mt-2 rounded-xl bg-creme/60 px-3 py-3 text-xs text-cinza">Selecione a cliente primeiro.</p>
        ) : (
          <div className="mt-2 space-y-2">
            <button
              type="button"
              onClick={() => setLeadId("")}
              className={`w-full rounded-xl border px-3 py-3 text-left text-xs font-bold ${!leadId ? "border-rosa-profundo bg-rosa/5 text-rosa-profundo" : "border-rosa/10 text-cinza"}`}
            >
              Sem oportunidade específica
            </button>
            {customerLeads.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => setLeadId(lead.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left ${leadId === lead.id ? "border-rosa-profundo bg-rosa/5" : "border-rosa/10"}`}
              >
                <p className="text-xs font-extrabold text-texto">{lead.productName || "Interesse sem produto definido"}</p>
                <p className="mt-1 text-[10px] font-bold uppercase text-cinza">{lead.stage.replaceAll("_", " ")}</p>
              </button>
            ))}
            {customerLeads.length === 0 && <p className="text-[10px] text-cinza">Esta cliente não tem oportunidade aberta; o retorno será vinculado apenas ao contato.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
