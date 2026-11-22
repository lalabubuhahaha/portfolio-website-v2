begin;

-- Generated payload schemas mirror lib/cms/blocks.ts. Regenerate the catalog
-- with z.toJSONSchema(schema, { cycles: 'ref' }) when adding a block version.
create function public.cms_block_payload_catalog()
returns jsonb language sql immutable set search_path = ''
as $catalog$
  select jsonb_object_agg(kind, schema::jsonb)
  from (values
    ('heading', $json${"type":"object","properties":{"text":{"type":"string","maxLength":200},"level":{"type":"string","enum":["h2","h3","h4"]},"alignment":{"type":"string","enum":["left","center","right"]},"emphasis":{"type":"string","enum":["normal","strong","italic"]},"anchor":{"type":"string","pattern":"^(?:[a-z][a-z0-9-]{0,79})?$"}},"required":["text"],"additionalProperties":false}$json$),
    ('rich-text', $json${"type":"object","properties":{"doc":{"$ref":"#/$defs/__schema0"}},"required":["doc"],"additionalProperties":false,"$defs":{"__schema0":{"type":"object","properties":{"type":{"type":"string","enum":["doc","paragraph","text","hardBreak","bulletList","orderedList","listItem","blockquote"]},"text":{"type":"string","minLength":1,"maxLength":16000},"marks":{"maxItems":8,"type":"array","items":{"oneOf":[{"type":"object","properties":{"type":{"type":"string","enum":["bold","italic","underline","strike","code"]}},"required":["type"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"link"},"attrs":{"type":"object","properties":{"href":{"type":"string","maxLength":2048},"target":{"anyOf":[{"type":"string","const":"_blank"},{"type":"null"}]},"rel":{"anyOf":[{"type":"string","maxLength":100},{"type":"null"}]},"class":{"type":"null"},"title":{"anyOf":[{"type":"string","maxLength":200},{"type":"null"}]}},"required":["href"],"additionalProperties":false}},"required":["type","attrs"],"additionalProperties":false},{"type":"object","properties":{"type":{"type":"string","const":"textStyle"},"attrs":{"type":"object","properties":{"color":{"anyOf":[{"type":"string","enum":["#182230","#475569","#2354c7","#a02548","#197052"]},{"type":"null"}]}},"additionalProperties":false}},"required":["type","attrs"],"additionalProperties":false}]}},"attrs":{"type":"object","properties":{"textAlign":{"anyOf":[{"type":"string","enum":["left","center","right"]},{"type":"null"}]},"start":{"type":"integer","minimum":1,"maximum":999},"type":{"anyOf":[{"type":"string","maxLength":12},{"type":"null"}]}},"additionalProperties":false},"content":{"maxItems":250,"type":"array","items":{"$ref":"#/$defs/__schema0"}}},"required":["type"],"additionalProperties":false}}}$json$),
    ('image', $json${"type":"object","properties":{"assetId":{"anyOf":[{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},{"type":"null"}]},"alt":{"type":"string","maxLength":200},"caption":{"type":"string","maxLength":600},"alignment":{"type":"string","enum":["left","center","right"]},"fit":{"type":"string","enum":["contain","cover"]},"aspect":{"type":"string","enum":["native","square","landscape","portrait"]}},"required":["assetId","alt","caption","alignment","fit","aspect"],"additionalProperties":false}$json$),
    ('gallery', $json${"type":"object","properties":{"images":{"maxItems":24,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},"assetId":{"anyOf":[{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},{"type":"null"}]},"alt":{"type":"string","maxLength":200},"caption":{"type":"string","maxLength":600}},"required":["id","assetId","alt","caption"],"additionalProperties":false}},"columns":{"type":"string","enum":["2","3","4"]},"gap":{"type":"string","enum":["tight","normal","wide"]},"mobileColumns":{"type":"string","enum":["1","2"]},"caption":{"type":"string","maxLength":600}},"required":["images","columns","gap","mobileColumns","caption"],"additionalProperties":false}$json$),
    ('columns', $json${"type":"object","properties":{"count":{"type":"string","enum":["2","3"]},"ratio":{"type":"string","enum":["equal","wide-left","wide-right"]},"stack":{"type":"boolean"}},"additionalProperties":false}$json$),
    ('image-text', $json${"type":"object","properties":{"assetId":{"anyOf":[{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},{"type":"null"}]},"alt":{"type":"string","maxLength":200},"caption":{"type":"string","maxLength":600},"heading":{"type":"string","maxLength":200},"description":{"type":"string","maxLength":8000},"side":{"type":"string","enum":["left","right"]},"ratio":{"type":"string","enum":["50:50","40:60","60:40"]},"stack":{"type":"boolean"}},"required":["assetId","alt","caption","heading","description","side","ratio","stack"],"additionalProperties":false}$json$),
    ('video', $json${"type":"object","properties":{"assetId":{"anyOf":[{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},{"type":"null"}]},"posterId":{"anyOf":[{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},{"type":"null"}]},"controls":{"type":"boolean"},"loop":{"type":"boolean"},"muted":{"type":"boolean"},"autoplay":{"type":"boolean"},"caption":{"type":"string","maxLength":600},"aspect":{"type":"string","enum":["native","square","landscape","portrait"]}},"required":["assetId","posterId","controls","loop","muted","autoplay","caption","aspect"],"additionalProperties":false}$json$),
    ('quote', $json${"type":"object","properties":{"quote":{"type":"string","maxLength":8000},"author":{"type":"string","maxLength":200},"source":{"type":"string","maxLength":200},"alignment":{"type":"string","enum":["left","center","right"]},"typography":{"type":"string","enum":["editorial","compact"]}},"required":["quote","author","source","alignment","typography"],"additionalProperties":false}$json$),
    ('metrics', $json${"type":"object","properties":{"items":{"maxItems":16,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},"value":{"type":"string","maxLength":200},"prefix":{"type":"string","maxLength":200},"suffix":{"type":"string","maxLength":200},"label":{"type":"string","maxLength":200},"description":{"type":"string","maxLength":600}},"required":["id","value","prefix","suffix","label","description"],"additionalProperties":false}},"columns":{"type":"string","enum":["1","2","3","4"]}},"required":["items","columns"],"additionalProperties":false}$json$),
    ('figma', $json${"type":"object","properties":{"url":{"anyOf":[{"type":"string","const":""},{"type":"string","maxLength":2048}]},"aspect":{"type":"string","enum":["square","landscape","portrait"]},"caption":{"type":"string","maxLength":600}},"required":["url","aspect","caption"],"additionalProperties":false}$json$),
    ('links', $json${"type":"object","properties":{"items":{"maxItems":12,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},"text":{"type":"string","maxLength":200},"url":{"anyOf":[{"type":"string","const":""},{"type":"string","maxLength":2048}]},"variant":{"type":"string","enum":["primary","secondary","text"]},"newTab":{"type":"boolean"}},"required":["id","text","url","variant","newTab"],"additionalProperties":false}},"alignment":{"type":"string","enum":["left","center","right"]}},"required":["items","alignment"],"additionalProperties":false}$json$),
    ('divider', $json${"type":"object","properties":{"line":{"type":"string","enum":["solid","dashed","subtle"]},"width":{"type":"string","enum":["short","medium","full"]},"spacing":{"type":"string","enum":["small","medium","large"]}},"required":["line","width","spacing"],"additionalProperties":false}$json$),
    ('spacer', $json${"type":"object","properties":{"size":{"type":"string","enum":["small","medium","large","custom"]},"height":{"type":"integer","minimum":8,"maximum":400},"mobileHeight":{"type":"integer","minimum":8,"maximum":240}},"required":["size","height","mobileHeight"],"additionalProperties":false}$json$),
    ('palette', $json${"type":"object","properties":{"swatches":{"maxItems":24,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},"name":{"type":"string","maxLength":200},"hex":{"type":"string","pattern":"^#[0-9a-f]{6}$"},"role":{"type":"string","maxLength":200}},"required":["id","name","hex","role"],"additionalProperties":false}},"columns":{"type":"string","enum":["2","3","4"]}},"required":["swatches","columns"],"additionalProperties":false}$json$),
    ('typography', $json${"type":"object","properties":{"font":{"type":"string","maxLength":200},"sample":{"type":"string","maxLength":8000},"weight":{"type":"string","enum":["400","500","600","700","800"]},"size":{"type":"integer","minimum":12,"maximum":144},"lineHeight":{"type":"number","minimum":0.8,"maximum":3},"letterSpacing":{"type":"number","minimum":-5,"maximum":20},"description":{"type":"string","maxLength":600}},"required":["font","sample","weight","size","lineHeight","letterSpacing"],"additionalProperties":false}$json$),
    ('comparison', $json${"type":"object","properties":{"beforeId":{"anyOf":[{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},{"type":"null"}]},"afterId":{"anyOf":[{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},{"type":"null"}]},"beforeLabel":{"type":"string","maxLength":200},"afterLabel":{"type":"string","maxLength":200},"mode":{"type":"string","enum":["side-by-side","slider"]},"stack":{"type":"boolean"}},"required":["beforeId","afterId","beforeLabel","afterLabel","mode","stack"],"additionalProperties":false}$json$)
  ) catalog(kind, schema)
$catalog$;

-- This validator implements the JSON Schema keywords used by the catalog.
create function public.cms_block_payload_matches(value jsonb, schema jsonb, definitions jsonb, depth integer)
returns boolean language plpgsql immutable set search_path = ''
as $$
declare
  kind text := jsonb_typeof(value);
  field text;
  item jsonb;
  choices jsonb;
  matches integer := 0;
  numeric_value numeric;
begin
  if depth > 36 or schema is null or value is null then return false; end if;
  if schema ? '$ref' then
    return public.cms_block_payload_matches(value, definitions -> split_part(schema->>'$ref', '/', 3), definitions, depth + 1);
  end if;
  choices := coalesce(schema->'anyOf', schema->'oneOf');
  if choices is not null then
    for item in select jsonb_array_elements(choices) loop
      if public.cms_block_payload_matches(value, item, definitions, depth + 1) then matches := matches + 1; end if;
    end loop;
    return case when schema ? 'oneOf' then matches = 1 else matches > 0 end;
  end if;
  if schema ? 'const' and value is distinct from schema->'const' then return false; end if;
  if schema ? 'enum' and not exists (select 1 from jsonb_array_elements(schema->'enum') e(option) where option = value) then
    return false;
  end if;
  if schema->>'type' = 'integer' then
    if kind <> 'number' or value::numeric <> trunc(value::numeric) then return false; end if;
  elsif kind is distinct from schema->>'type' then
    return false;
  end if;
  case kind
    when 'object' then
      for field in select jsonb_array_elements_text(coalesce(schema->'required', '[]'::jsonb)) loop
        if not value ? field then return false; end if;
      end loop;
      for field, item in select key, e.value from jsonb_each(value) e loop
        if not public.cms_block_payload_matches(item, schema->'properties'->field, definitions, depth + 1) then
          return false;
        end if;
      end loop;
    when 'array' then
      if schema ? 'maxItems' and jsonb_array_length(value) > (schema->>'maxItems')::integer then return false; end if;
      for item in select jsonb_array_elements(value) loop
        if not public.cms_block_payload_matches(item, schema->'items', definitions, depth + 1) then return false; end if;
      end loop;
    when 'string' then
      field := value #>> '{}';
      if (schema ? 'maxLength' and char_length(field) > (schema->>'maxLength')::integer)
        or (schema ? 'minLength' and char_length(field) < (schema->>'minLength')::integer)
        or (schema ? 'pattern' and field !~ (schema->>'pattern')) then return false; end if;
    when 'number' then
      numeric_value := value::numeric;
      if (schema ? 'minimum' and numeric_value < (schema->>'minimum')::numeric)
        or (schema ? 'maximum' and numeric_value > (schema->>'maximum')::numeric) then return false; end if;
    else null;
  end case;
  return true;
end;
$$;

create function public.cms_walk_case_study(document jsonb)
returns table (block jsonb, depth integer, parent jsonb)
language sql immutable set search_path = ''
as $$
  with recursive tree(block, depth, parent) as (
    select root, 1, null::jsonb from jsonb_array_elements(
      case when jsonb_typeof(document->'blocks') = 'array' then document->'blocks' else '[]'::jsonb end
    ) root
    union all
    select child, tree.depth + 1, tree.block
    from tree cross join lateral jsonb_array_elements(
      case when jsonb_typeof(tree.block->'children') = 'array' then tree.block->'children' else '[]'::jsonb end
    ) child where tree.depth <= 5
  )
  select * from tree
$$;

create function public.cms_case_study_valid(document jsonb)
returns boolean language plpgsql immutable set search_path = ''
as $$
declare
  entry record;
  payload jsonb;
  schema jsonb;
  catalog jsonb := public.cms_block_payload_catalog();
  block_type text;
  block_id text;
  seen text[] := '{}';
  lane jsonb;
  lanes text;
  link text;
begin
  if jsonb_typeof(document) is distinct from 'object'
    or document - array['version','blocks'] <> '{}'::jsonb
    or document->'version' is distinct from '1'::jsonb
    or jsonb_typeof(document->'blocks') is distinct from 'array'
    or octet_length(document::text) > 250000 then return false; end if;
  for entry in select * from public.cms_walk_case_study(document) loop
    block_type := entry.block->>'type';
    block_id := lower(entry.block->>'id');
    payload := entry.block->'content';
    schema := catalog->block_type;
    if entry.depth > 5 or cardinality(seen) >= 150 or schema is null
      or jsonb_typeof(entry.block) is distinct from 'object'
      or entry.block - array['id','type','content','blockVersion','layout','styles','animation','responsive','children'] <> '{}'::jsonb
      or block_id is null or block_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or block_id = any(seen)
      or (entry.block ? 'blockVersion' and entry.block->'blockVersion' <> '1'::jsonb)
      or exists (select 1 from unnest(array['layout','styles','animation','responsive']) key
        where entry.block ? key and jsonb_typeof(entry.block->key) <> 'object')
      or (entry.block ? 'children' and
        (jsonb_typeof(entry.block->'children') <> 'array' or
        (block_type <> 'columns' and entry.block->'children' <> '[]'::jsonb)))
      or not public.cms_block_payload_matches(payload, schema, schema->'$defs', 0)
    then return false; end if;
    seen := array_append(seen, block_id);
    lanes := coalesce(entry.block#>>'{content,count}', entry.block#>>'{layout,columns}', '2');
    if block_type = 'columns' and lanes not in ('2','3') then return false; end if;
    lane := entry.block#>'{layout,column}';
    if lane is not null then
      lanes := coalesce(entry.parent#>>'{content,count}', entry.parent#>>'{layout,columns}', '2');
      if entry.parent is null or lane not in ('0'::jsonb,'1'::jsonb,'2'::jsonb)
        or (lanes = '2' and lane = '2'::jsonb) then return false; end if;
    end if;

    if block_type = 'figma' then
      link := payload->>'url';
      if link <> '' and link !~ '^https://www[.]figma[.]com/proto/[A-Za-z0-9_-]+(/[^/?#[:space:]\\]+)?/?([?#][^[:space:]\\]*)?$'
        then return false; end if;
    elsif block_type in ('rich-text','links') then
      if block_type = 'rich-text' and payload#>>'{doc,type}' is distinct from 'doc' then return false; end if;
      for link in select url.value #>> '{}' from jsonb_path_query(payload,
        case when block_type = 'links' then '$.items[*].url'::jsonpath else '$.doc.**.marks[*] ? (@.type == "link").attrs.href'::jsonpath end
      ) url(value) loop
        if (link <> '' or block_type = 'rich-text') and link !~* '^https?://[^@/?#[:space:]\\]+([/?#][^[:space:]\\]*)?$'
          then return false; end if;
      end loop;
    end if;
  end loop;
  return true;
end;
$$;

create function public.cms_case_study_refs(document jsonb)
returns table (asset_id uuid, media_kind text) language sql immutable set search_path = ''
as $$
  select distinct raw.ref::uuid, raw.kind
  from public.cms_walk_case_study(document) entry
  cross join lateral (
    select entry.block#>>'{content,assetId}', 'image' where entry.block->>'type' in ('image','image-text')
    union all select entry.block#>>'{content,assetId}', 'motion' where entry.block->>'type' = 'video'
    union all select entry.block#>>'{content,posterId}', 'image' where entry.block->>'type' = 'video'
    union all select entry.block#>>'{content,beforeId}', 'image' where entry.block->>'type' = 'comparison'
    union all select entry.block#>>'{content,afterId}', 'image' where entry.block->>'type' = 'comparison'
    union all select item->>'assetId', 'image'
      from jsonb_array_elements(case when entry.block->>'type' = 'gallery'
        and jsonb_typeof(entry.block#>'{content,images}') = 'array' then entry.block#>'{content,images}' else '[]'::jsonb end) item
  ) raw(ref, kind)
  where raw.ref ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
$$;

create function public.cms_case_study_asset_ids(document jsonb)
returns uuid[] language sql immutable set search_path = ''
as $$
  select coalesce(array_agg(distinct asset_id), '{}'::uuid[]) from public.cms_case_study_refs(document)
$$;
create index cms_revision_block_assets_idx on public.project_revisions using gin (public.cms_case_study_asset_ids(content_blocks));
create index cms_revision_cover_idx on public.project_revisions (cover_asset_id) where cover_asset_id is not null;

create or replace function public.cms_media_guard_reference()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare
  changed boolean := tg_op = 'INSERT';
  valid boolean;
begin
  if tg_op = 'UPDATE' then changed := new.content_blocks is distinct from old.content_blocks; end if;
  if not changed and new.cover_asset_id is not distinct from old.cover_asset_id then return new; end if;
  if new.cover_asset_id is null and new.content_blocks = '{"version":1,"blocks":[]}'::jsonb then return new; end if;
  perform pg_advisory_xact_lock(73003001);
  if new.cover_asset_id is not null and not exists (
    select 1 from public.media_assets a where a.id = new.cover_asset_id
      and a.storage_bucket = 'cms-private' and a.state = 'ready' and a.mime_type like 'image/%'
  ) then raise exception using errcode = '22023', message = 'Cover is unavailable'; end if;

  valid := public.cms_case_study_valid(new.content_blocks);
  if changed and not valid then
    -- Existing unknown documents can only be copied unchanged into a new
    -- revision of the same project by the pre-existing metadata save path.
    if tg_op <> 'INSERT' or not exists (
      select 1 from public.project_revisions r
      where r.project_id = new.project_id and r.content_blocks = new.content_blocks
    ) then raise exception using errcode = '22023', message = 'Invalid case study document'; end if;
  end if;

  if valid and exists (
    select 1 from public.cms_case_study_refs(new.content_blocks) ref
    left join public.media_assets a on a.id = ref.asset_id and a.storage_bucket = 'cms-private' and a.state = 'ready'
    where a.id is null or not case ref.media_kind
      when 'motion' then a.mime_type in ('image/gif','video/mp4','video/webm')
      else a.mime_type in ('image/jpeg','image/png','image/webp','image/avif','image/gif')
    end
  ) then raise exception using errcode = '22023', message = 'Case study references unavailable or incompatible media'; end if;
  if not valid and exists (
    select 1 from public.media_assets a where a.state <> 'ready'
      and position(a.id::text in lower(new.content_blocks::text)) > 0
  ) then raise exception using errcode = '22023', message = 'Older content references unavailable media'; end if;
  return new;
end;
$$;

create or replace function public.cms_media_begin_delete(asset uuid)
returns boolean language plpgsql security invoker set search_path = ''
as $$
declare entry public.media_assets;
begin
  perform pg_advisory_xact_lock(73003001);
  select * into entry from public.media_assets a where a.id = asset and a.storage_bucket = 'cms-private' for update;
  if not found then return false; end if;
  if entry.state = 'uploading' and entry.created_at > clock_timestamp() - interval '10 minutes' then
    raise exception using errcode = 'PT409', message = 'Upload still active';
  end if;
  if exists (select 1 from public.project_revisions r
    where r.cover_asset_id = asset or public.cms_case_study_asset_ids(r.content_blocks) @> array[asset])
    or exists (select 1 from public.project_revisions r
      where position(asset::text in lower(r.content_blocks::text)) > 0
        and not public.cms_case_study_valid(r.content_blocks))
  then raise exception using errcode = 'PT409', message = 'Asset is referenced'; end if;
  update public.media_assets a set state = 'deleting' where a.id = asset;
  return true;
end;
$$;

create function public.cms_save_case_study(project uuid, expected timestamptz, fields jsonb, document jsonb)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare saved jsonb;
declare saved_project uuid;
begin
  if not public.is_cms_admin() then raise exception using errcode = '42501', message = 'Admin access required'; end if;
  if not public.cms_case_study_valid(document) then raise exception using errcode = '22023', message = 'Invalid case study document'; end if;
  saved := public.cms_save_draft(project, expected, fields);
  saved_project := (saved->>'id')::uuid;
  update public.project_revisions r set content_blocks = document
  where r.id = (
    select newest.id from public.project_revisions newest where newest.project_id = saved_project
    order by newest.revision_number desc limit 1
  ) and r.sealed_at is null
    and not exists (select 1 from public.project_site_settings s where s.published_revision_id = r.id);
  if not found then raise exception using errcode = 'P0002', message = 'Draft unavailable'; end if;
  return (select jsonb_build_object('id', id, 'updatedAt', updated_at) from public.projects where id = saved_project);
end;
$$;

grant update (content_blocks) on public.project_revisions to authenticated;
revoke all on function public.cms_block_payload_catalog(), public.cms_block_payload_matches(jsonb,jsonb,jsonb,integer),
  public.cms_walk_case_study(jsonb), public.cms_case_study_valid(jsonb), public.cms_case_study_refs(jsonb),
  public.cms_case_study_asset_ids(jsonb), public.cms_save_case_study(uuid,timestamptz,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.cms_block_payload_catalog(), public.cms_block_payload_matches(jsonb,jsonb,jsonb,integer),
  public.cms_walk_case_study(jsonb), public.cms_case_study_valid(jsonb), public.cms_case_study_refs(jsonb),
  public.cms_case_study_asset_ids(jsonb) to authenticated, service_role;
grant execute on function public.cms_save_case_study(uuid,timestamptz,jsonb,jsonb) to authenticated;

commit;
