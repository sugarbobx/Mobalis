-- MOBALIS — stockage des PDF de bulletin séquentiel dans Supabase Storage
-- Bucket "bulletin sequentiel" (identifiant technique conservé tel quel,
-- avec espace — décision explicite de l'admin, pas renommé). Convention de
-- chemin des objets : {eleve_id}/{sequence_id}.pdf

create table bulletin_pdfs (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves(id) on delete cascade,
  sequence_id uuid not null references sequences(id) on delete cascade,
  storage_path text not null,
  genere_par uuid references auth.users(id),
  genere_le timestamptz not null default now(),
  unique (eleve_id, sequence_id)
);

alter table bulletin_pdfs enable row level security;

-- Admin/Tutor : accès total (même périmètre d'autorisation que le RPC
-- get_bulletin_sequence — is_admin() ou tuteur réel de l'élève).
create policy "bulletin_pdfs_admin_tutor_all" on bulletin_pdfs for all to authenticated
  using (is_admin() or is_eleve_of_repetiteur(eleve_id))
  with check (is_admin() or is_eleve_of_repetiteur(eleve_id));

create policy "bulletin_pdfs_select_parent" on bulletin_pdfs for select to authenticated
  using (is_eleve_of_parent(eleve_id));

create policy "bulletin_pdfs_select_eleve" on bulletin_pdfs for select to authenticated
  using (eleve_id = current_eleve_id());

-- ============================================================
-- storage.objects — même logique de rôles sur le bucket "bulletin sequentiel".
-- Chemin {eleve_id}/{sequence_id}.pdf -> split_part(name,'/',1)::uuid = eleve_id
-- ============================================================

create policy "bulletin_storage_admin_tutor_all" on storage.objects for all to authenticated
  using (
    bucket_id = 'bulletin sequentiel'
    and (is_admin() or is_eleve_of_repetiteur((split_part(name, '/', 1))::uuid))
  )
  with check (
    bucket_id = 'bulletin sequentiel'
    and (is_admin() or is_eleve_of_repetiteur((split_part(name, '/', 1))::uuid))
  );

create policy "bulletin_storage_select_parent" on storage.objects for select to authenticated
  using (
    bucket_id = 'bulletin sequentiel'
    and is_eleve_of_parent((split_part(name, '/', 1))::uuid)
  );

create policy "bulletin_storage_select_eleve" on storage.objects for select to authenticated
  using (
    bucket_id = 'bulletin sequentiel'
    and (split_part(name, '/', 1))::uuid = current_eleve_id()
  );
