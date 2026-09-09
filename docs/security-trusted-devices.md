# Aparelhos confiáveis no painel administrativo

- O MFA TOTP continua obrigatório para cadastrar um aparelho como confiável.
- Após confirmar o código, o navegador pode permanecer confiável por 30 dias.
- A confiança é vinculada à conta administrativa e a um token aleatório salvo em cookie HttpOnly.
- O banco armazena somente o hash SHA-256 do token, nunca o token original.
- Um aparelho confiável pode ser removido em `/admin/dispositivos`.
- Ao expirar, ser removido, trocar de navegador ou limpar os cookies, o MFA volta a ser solicitado.
- A sessão Supabase continua sendo necessária: o cookie de confiança sozinho não autentica ninguém.
