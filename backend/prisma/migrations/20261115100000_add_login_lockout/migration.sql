ALTER TABLE "usuario"
    ADD COLUMN "falhas_login" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "login_bloqueado_ate" TIMESTAMPTZ(6);

ALTER TABLE "usuario"
    ADD CONSTRAINT "usuario_falhas_login_nonnegative_check"
    CHECK ("falhas_login" >= 0);
