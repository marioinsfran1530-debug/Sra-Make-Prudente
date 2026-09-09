CREATE SCHEMA IF NOT EXISTS app_security;
ALTER TABLE public."ApiRateLimit" SET SCHEMA app_security;
REVOKE ALL ON SCHEMA app_security FROM PUBLIC;
GRANT USAGE ON SCHEMA app_security TO service_role;
GRANT ALL ON TABLE app_security."ApiRateLimit" TO service_role;
