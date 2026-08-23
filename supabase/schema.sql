-- =====================================================================
--  ReRead — full database schema
--  Paste this whole file into: Supabase dashboard -> SQL Editor -> New query -> Run
--  Safe to run more than once (everything is "if not exists").
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles
-- Our own auth lives here (scrypt hash + HMAC cookie), NOT Supabase Auth —
-- the app already had a working session layer and pitch weekend is the wrong
-- time to swap authentication systems.
create table if not exists profiles (
  id                    uuid primary key default gen_random_uuid(),
  name                  text        not null,
  email                 text        not null,
  password_hash         text        not null,
  school                text        not null default '',
  class_name            text        not null default '',
  avatar_url            text,
  -- Verified Student: upload a school ID photo, admin approves it.
  verification_status   text        not null default 'none',   -- none|pending|approved|rejected
  verification_doc_url  text,
  -- ReRead Plus membership
  is_plus               boolean     not null default false,
  plus_expires_at       timestamptz,
  -- Rolled up from reviews so cards don't have to aggregate on every render
  rating_avg            numeric(3,2) not null default 0,
  rating_count          int         not null default 0,
  -- Growth loop
  referral_code         text        not null,
  referred_by           uuid        references profiles(id) on delete set null,
  boost_credits         int         not null default 0,
  wallet_credit         int         not null default 0,        -- rupees off next purchase
  -- Escrow ledger: what ReRead owes this seller from completed sales
  payout_balance        int         not null default 0,
  is_admin              boolean     not null default false,
  created_at            timestamptz not null default now()
);

-- Emails are matched case-insensitively everywhere, so enforce that in the index.
create unique index if not exists profiles_email_key on profiles (lower(email));
create unique index if not exists profiles_referral_code_key on profiles (referral_code);

-- ---------------------------------------------------------------- listings
-- Text primary key so the 12 seeded demo books keep their `book-1` ids and
-- user listings keep the existing `user-<timestamp>` scheme.
create table if not exists listings (
  id              text primary key,
  seller_id       uuid        not null references profiles(id) on delete cascade,
  title           text        not null,
  price           int         not null,
  original_price  int         not null,
  cover_url       text        not null,
  condition       text        not null,                        -- New|Like New|Good|Fair
  subject         text        not null default 'General',
  class_name      text        not null default '',
  board           text        not null default 'CBSE',
  publication     text        not null default 'Not specified',
  description     text        not null default '',
  school          text        not null default '',
  status          text        not null default 'active',       -- active|reserved|sold|removed
  views           int         not null default 0,
  featured_until  timestamptz,                                 -- paid boost expiry
  created_at      timestamptz not null default now()
);

create index if not exists listings_status_created_idx on listings (status, created_at desc);
create index if not exists listings_seller_idx on listings (seller_id);
create index if not exists listings_featured_idx on listings (featured_until desc nulls last);

-- ---------------------------------------------------------------- orders
-- One row per purchase. Money is held (escrow) until the meetup handover code
-- is entered by the seller, then released to the seller's payout_balance.
create table if not exists orders (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          text        not null references listings(id) on delete cascade,
  buyer_id            uuid        not null references profiles(id) on delete cascade,
  seller_id           uuid        not null references profiles(id) on delete cascade,
  amount              int         not null,   -- what the buyer pays, in rupees
  platform_fee        int         not null,   -- ReRead's commission
  seller_payout       int         not null,   -- amount - platform_fee
  fee_percent         numeric(5,2) not null,  -- 8.00 normally, 4.00 for Plus sellers
  status              text        not null default 'pending',  -- pending|paid|completed|cancelled
  handover_code       text        not null,   -- 6 digits, buyer shows it at the meetup
  razorpay_order_id   text,
  razorpay_payment_id text,
  payment_mode        text        not null default 'razorpay',  -- razorpay|simulated
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);

create index if not exists orders_buyer_idx  on orders (buyer_id, created_at desc);
create index if not exists orders_seller_idx on orders (seller_id, created_at desc);
create index if not exists orders_status_idx on orders (status, created_at desc);
-- One live order per listing: a second buyer can't check out a reserved book.
create unique index if not exists orders_one_live_per_listing
  on orders (listing_id) where status in ('pending', 'paid');

-- ---------------------------------------------------------------- reviews
-- Both sides rate each other after a completed order. One review per person
-- per order, enforced by the unique index.
create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid        not null references orders(id) on delete cascade,
  reviewer_id  uuid        not null references profiles(id) on delete cascade,
  reviewee_id  uuid        not null references profiles(id) on delete cascade,
  rating       int         not null check (rating between 1 and 5),
  comment      text        not null default '',
  created_at   timestamptz not null default now()
);

create unique index if not exists reviews_one_per_order_per_reviewer
  on reviews (order_id, reviewer_id);
create index if not exists reviews_reviewee_idx on reviews (reviewee_id, created_at desc);

-- ---------------------------------------------------------------- chat
create table if not exists conversations (
  id              uuid primary key default gen_random_uuid(),
  listing_id      text        not null references listings(id) on delete cascade,
  buyer_id        uuid        not null references profiles(id) on delete cascade,
  seller_id       uuid        not null references profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- One thread per buyer per book — "Message Seller" twice reopens, never duplicates.
create unique index if not exists conversations_unique_thread
  on conversations (listing_id, buyer_id);
create index if not exists conversations_buyer_idx  on conversations (buyer_id, last_message_at desc);
create index if not exists conversations_seller_idx on conversations (seller_id, last_message_at desc);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid        not null references conversations(id) on delete cascade,
  sender_id       uuid        not null references profiles(id) on delete cascade,
  body            text        not null,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx on messages (conversation_id, created_at);

-- ---------------------------------------------------------------- wishlist & demand
create table if not exists wishlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  listing_id text        not null references listings(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists wishlists_unique on wishlists (user_id, listing_id);

-- "Tell me when a Class 12 Physics book is listed"
create table if not exists book_alerts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  keyword    text        not null default '',
  subject    text        not null default '',
  class_name text        not null default '',
  created_at timestamptz not null default now()
);

create index if not exists book_alerts_user_idx on book_alerts (user_id);

-- The demand board: "I need TS Grewal Class 12, max ₹200"
create table if not exists book_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  title      text        not null,
  subject    text        not null default '',
  class_name text        not null default '',
  max_price  int         not null default 0,
  note       text        not null default '',
  status     text        not null default 'open',   -- open|fulfilled|closed
  created_at timestamptz not null default now()
);

create index if not exists book_requests_status_idx on book_requests (status, created_at desc);

-- ---------------------------------------------------------------- advertising
create table if not exists ads (
  id              uuid primary key default gen_random_uuid(),
  advertiser_id   uuid        references profiles(id) on delete set null,
  advertiser_name text        not null,
  headline        text        not null,
  body            text        not null default '',
  image_url       text,
  target_url      text        not null,
  cta_label       text        not null default 'Learn more',
  budget          int         not null,                        -- rupees paid
  status          text        not null default 'pending',      -- pending|active|paused|rejected
  impressions     int         not null default 0,
  clicks          int         not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists ads_status_idx on ads (status, created_at desc);

-- ---------------------------------------------------------------- money ledger
-- Every rupee ReRead earns, across all four revenue streams. This table is
-- what the /admin dashboard charts.
create table if not exists payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid        references profiles(id) on delete set null,
  kind                text        not null,   -- commission|featured|plus|ad
  amount              int         not null,   -- ReRead's revenue, in rupees
  order_id            uuid        references orders(id) on delete set null,
  listing_id          text        references listings(id) on delete set null,
  ad_id               uuid        references ads(id) on delete set null,
  razorpay_order_id   text,
  razorpay_payment_id text,
  mode                text        not null default 'razorpay', -- razorpay|simulated
  created_at          timestamptz not null default now()
);

create index if not exists payments_kind_idx    on payments (kind, created_at desc);
create index if not exists payments_created_idx on payments (created_at desc);

-- ---------------------------------------------------------------- notifications
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  kind       text        not null,          -- message|order|review|alert|system|referral
  title      text        not null,
  body       text        not null default '',
  link       text        not null default '/',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

-- ---------------------------------------------------------------- live viewers
-- Powers "3 students are viewing this book right now". Rows are ignored after
-- a few minutes; a cleanup delete runs opportunistically on read.
create table if not exists view_events (
  id           uuid primary key default gen_random_uuid(),
  listing_id   text        not null references listings(id) on delete cascade,
  session_hash text        not null,
  created_at   timestamptz not null default now()
);

create index if not exists view_events_listing_idx on view_events (listing_id, created_at desc);

-- ---------------------------------------------------------------- web push
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  endpoint   text        not null,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now()
);

create unique index if not exists push_subscriptions_endpoint_key on push_subscriptions (endpoint);

-- =====================================================================
--  Row Level Security
--  The app talks to Postgres only from the server with the service_role key,
--  which bypasses RLS. Enabling RLS with NO policies means the public `anon`
--  key — which does ship to the browser — can read and write absolutely
--  nothing. That is the intended, locked-down state.
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','listings','orders','reviews','conversations','messages',
    'wishlists','book_alerts','book_requests','ads','payments','notifications',
    'view_events','push_subscriptions'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
