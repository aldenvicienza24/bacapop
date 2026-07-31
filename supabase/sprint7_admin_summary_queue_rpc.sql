-- Reliable admin summary queue reader.
-- Run after sprint6_admin_summary_visibility.sql.

create or replace function public.admin_get_summary_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat melihat seluruh ringkasan.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', summaries.id,
        'user_id', summaries.user_id,
        'book_id', summaries.book_id,
        'title', summaries.title,
        'summary_text', summaries.summary_text,
        'status', summaries.status,
        'points_awarded', summaries.points_awarded,
        'admin_note', summaries.admin_note,
        'submitted_at', summaries.submitted_at,
        'validated_at', summaries.validated_at,
        'profile', jsonb_build_object(
          'id', summaries.user_id,
          'full_name', coalesce(profiles.full_name, users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name'),
          'email', coalesce(profiles.email, users.email),
          'points', coalesce(profiles.points, 0)
        ),
        'books', jsonb_build_object(
          'id', books.id,
          'title', books.title,
          'author', books.author,
          'genres', case
            when genres.id is null then null
            else jsonb_build_object(
              'id', genres.id,
              'name', genres.name,
              'slug', genres.slug,
              'theme_color', genres.theme_color,
              'accent_color', genres.accent_color
            )
          end
        )
      )
      order by summaries.submitted_at desc
    ),
    '[]'::jsonb
  ) into v_result
  from public.summaries
  left join public.profiles on profiles.id = summaries.user_id
  left join auth.users on users.id = summaries.user_id
  left join public.books on books.id = summaries.book_id
  left join public.genres on genres.id = books.genre_id;

  return v_result;
end
$$;

revoke all on function public.admin_get_summary_queue() from public;
grant execute on function public.admin_get_summary_queue() to authenticated;

notify pgrst, 'reload schema';
