-- Seed example for Content Tracker
-- Run after schema.sql and after you are authenticated as a user.

-- Replace this UUID with your auth user id before running manually
-- select auth.uid();

insert into public.custom_field_definitions (user_id, key, name, field_type, is_required)
values
  (auth.uid(), 'hook', 'Hook', 'text', false),
  (auth.uid(), 'talent_name', 'Nama Talent', 'text', false),
  (auth.uid(), 'shoot_location', 'Lokasi Shooting', 'text', false),
  (auth.uid(), 'asset_link', 'Link Asset', 'url', false)
on conflict (user_id, key) do nothing;

with selected_field as (
  select id from public.custom_field_definitions
  where user_id = auth.uid() and key = 'platform_focus'
)
insert into public.content_items (
  user_id,
  title,
  brief,
  platform,
  content_type,
  status,
  priority,
  deadline,
  notes,
  tags,
  references_links,
  objective,
  target_audience,
  call_to_action,
  content_pillar,
  campaign_name
)
values
  (
    auth.uid(),
    'Edukasi Skincare Kulit Berminyak #1',
    'Buat konten edukasi singkat soal ingredients untuk kulit berminyak.',
    'TikTok',
    'Reels',
    'To Do',
    'High',
    (current_date + interval '2 day')::date,
    'Pakai CTA ke WhatsApp.',
    '["skincare", "edukasi"]'::jsonb,
    '["https://example.com/reference-a"]'::jsonb,
    'Meningkatkan awareness',
    'Perempuan 18-30 tahun',
    'Konsultasi gratis via WhatsApp',
    'Education',
    'Ramadan Skin Health'
  ),
  (
    auth.uid(),
    'Carousel Promo Paket Acne Care',
    'Konten promo hard selling dengan penawaran terbatas.',
    'Instagram',
    'Carousel',
    'On Going',
    'Urgent',
    (current_date + interval '1 day')::date,
    'Masukkan social proof.',
    '["promo", "acne"]'::jsonb,
    '["https://example.com/reference-b"]'::jsonb,
    'Leads WhatsApp',
    'Pemilik masalah jerawat aktif',
    'Klik link WhatsApp sekarang',
    'Promotion',
    'Q2 Conversion Sprint'
  )
on conflict do nothing;
