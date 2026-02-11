-- Add a client-provided external id to orders for idempotency across retries
-- This value should be unique when provided

alter table if exists orders
  add column if not exists client_external_id text;

-- Unique index only when value is not null
create unique index if not exists uq_orders_client_external_id
  on orders(client_external_id)
  where client_external_id is not null;

-- Helpful lookup index for webhooks/queries (already have xendit_invoice_id index elsewhere)
create index if not exists idx_orders_client_external_id
  on orders(client_external_id);
