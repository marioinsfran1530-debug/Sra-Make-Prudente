-- O site e o painel leem e gravam pelo servidor (conexão postgres via Prisma).
-- Visitante (anon) e usuário logado (authenticated) não precisam de acesso direto às tabelas.
-- Fecha a API REST/GraphQL do Supabase para as tabelas do schema public:
-- antes, a chave pública lia custo (costPrice) e estoque dos produtos.
-- Já aplicada no Supabase em 2026-10-29 (migração revoke_anon_authenticated_table_access).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Tabelas, sequências e funções criadas no futuro nascem sem acesso para esses papéis.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
