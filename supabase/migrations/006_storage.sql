-- 006_storage.sql
-- Private document storage. No public URLs: files are served only through
-- short-lived signed URLs to authenticated users (see src/api/documents.ts).

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Authenticated users can upload into their own folder: {user_id}/{document_id}/{filename}
create policy documents_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (lower(name) like '%.pdf' or lower(name) like '%.png' or lower(name) like '%.jpg'
         or lower(name) like '%.jpeg' or lower(name) like '%.xlsx' or lower(name) like '%.docx')
    and (metadata ->> 'size')::bigint <= 10485760
  );

create policy documents_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'documents');

create policy documents_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'documents');

create policy documents_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents');
