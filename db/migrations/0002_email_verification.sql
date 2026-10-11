-- 0002: one-time links that confirm a guest owns their email address (hash of the token, 24 hours).
create table if not exists email_verifications (
  token_hash  text primary key,
  user_id     bigint not null references users (id) on delete cascade,
  expires_at  timestamptz not null
);
create index if not exists email_verifications_user_idx on email_verifications (user_id);
