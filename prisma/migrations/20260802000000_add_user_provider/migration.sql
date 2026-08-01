-- CreateTable
CREATE TABLE "user_provider" (
    "id" SERIAL NOT NULL,
    "provider_id" VARCHAR(64) NOT NULL,
    "cid_hash" VARCHAR(64),
    "fullname" VARCHAR(255),
    "hoscode" VARCHAR(10),
    "role" VARCHAR(20) NOT NULL DEFAULT 'guest',
    "login_count" INTEGER NOT NULL DEFAULT 0,
    "last_activity" TIMESTAMPTZ(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "profile" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_provider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_provider_provider_id_key" ON "user_provider"("provider_id");
