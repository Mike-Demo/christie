-- Roles (health dashboard is admin-only)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Anonymous usage counters. NEVER stores submitted text or any fragment of it.
CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  operation text NOT NULL,
  character_count integer NOT NULL DEFAULT 0,
  issue_count integer NOT NULL DEFAULT 0,
  success boolean NOT NULL,
  error_code text,
  latency_ms integer NOT NULL DEFAULT 0,
  -- Reserved for future paid plans; unused in the free MVP.
  plan_id text,
  quota_bucket text,
  subscription_status text,
  CONSTRAINT usage_events_operation_check CHECK (char_length(operation) <= 64),
  CONSTRAINT usage_events_error_code_check CHECK (error_code IS NULL OR char_length(error_code) <= 64),
  CONSTRAINT usage_events_counts_check CHECK (character_count >= 0 AND issue_count >= 0 AND latency_ms >= 0)
);

CREATE INDEX usage_events_user_created_idx ON public.usage_events (user_id, created_at DESC);
CREATE INDEX usage_events_created_idx ON public.usage_events (created_at DESC);

GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own usage events"
  ON public.usage_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all usage events"
  ON public.usage_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fixed one-hour-window rate limiting, keyed on the authenticated user id.
CREATE TABLE public.rate_limits (
  user_id uuid NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, window_start)
);

GRANT SELECT ON public.rate_limits TO authenticated;
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own rate limit rows"
  ON public.rate_limits FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Atomic increment. Returns the new count for the caller's current UTC hour window.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(_limit integer)
RETURNS TABLE (allowed boolean, current_count integer, window_start timestamptz, retry_after_s integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _bucket timestamptz := date_trunc('hour', now());
  _count integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  INSERT INTO public.rate_limits AS rl (user_id, window_start, count, updated_at)
  VALUES (_uid, _bucket, 1, now())
  ON CONFLICT (user_id, window_start)
  DO UPDATE SET count = rl.count + 1, updated_at = now()
  RETURNING rl.count INTO _count;

  RETURN QUERY SELECT
    (_count <= _limit),
    _count,
    _bucket,
    GREATEST(0, CEIL(EXTRACT(EPOCH FROM ((_bucket + interval '1 hour') - now())))::integer);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(integer) TO service_role;

-- Usage events are written only through this definer function, so callers can
-- never insert arbitrary rows or attribute usage to another user.
CREATE OR REPLACE FUNCTION public.record_usage_event(
  _operation text,
  _character_count integer,
  _issue_count integer,
  _success boolean,
  _error_code text,
  _latency_ms integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  INSERT INTO public.usage_events (
    user_id, operation, character_count, issue_count, success, error_code, latency_ms
  ) VALUES (
    _uid,
    left(coalesce(_operation, 'unknown'), 64),
    greatest(coalesce(_character_count, 0), 0),
    greatest(coalesce(_issue_count, 0), 0),
    coalesce(_success, false),
    left(_error_code, 64),
    greatest(coalesce(_latency_ms, 0), 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_usage_event(text, integer, integer, boolean, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.record_usage_event(text, integer, integer, boolean, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_usage_event(text, integer, integer, boolean, text, integer) TO service_role;

-- Aggregated, anonymous counters for the admin health dashboard.
CREATE OR REPLACE FUNCTION public.usage_health_summary()
RETURNS TABLE (
  bucket_hour timestamptz,
  request_count bigint,
  success_count bigint,
  error_count bigint,
  distinct_users bigint,
  avg_latency_ms numeric,
  avg_character_count numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    date_trunc('hour', created_at) AS bucket_hour,
    count(*) AS request_count,
    count(*) FILTER (WHERE success) AS success_count,
    count(*) FILTER (WHERE NOT success) AS error_count,
    count(DISTINCT user_id) AS distinct_users,
    round(avg(latency_ms)::numeric, 1) AS avg_latency_ms,
    round(avg(character_count)::numeric, 1) AS avg_character_count
  FROM public.usage_events
  WHERE public.has_role(auth.uid(), 'admin')
    AND created_at >= now() - interval '7 days'
  GROUP BY 1
  ORDER BY 1 DESC;
$$;

REVOKE ALL ON FUNCTION public.usage_health_summary() FROM public;
GRANT EXECUTE ON FUNCTION public.usage_health_summary() TO authenticated;