-- Database Export
-- Generated on: 2026-11-24T02:50:17.530Z
-- Format: SQL
-- Include Data: false
-- Row Limit: 1000 rows per table

-- Table: app_users
CREATE TABLE IF NOT EXISTS app_users (id uuid NOT NULL DEFAULT gen_random_uuid(), nid integer NOT NULL, user_id text NOT NULL, password text NOT NULL, name text NOT NULL, role text, allowed_semesters text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), current_session_token text, last_login_date date, login_count_today integer DEFAULT 0, extra_logins_allowed integer DEFAULT 0);

-- Triggers for table: app_users
CREATE TRIGGER app_users_update_timestamp BEFORE UPDATE ON app_users FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- Table: chapter_pdfs
CREATE TABLE IF NOT EXISTS chapter_pdfs (id uuid NOT NULL DEFAULT gen_random_uuid(), nid integer NOT NULL, chapter_id integer, title text NOT NULL, url text NOT NULL, order_index integer, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

-- Triggers for table: chapter_pdfs
CREATE TRIGGER chapter_pdfs_update_timestamp BEFORE UPDATE ON chapter_pdfs FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- Table: chapters
CREATE TABLE IF NOT EXISTS chapters (id uuid NOT NULL DEFAULT gen_random_uuid(), nid integer NOT NULL, name text NOT NULL, description text, semester text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

-- Triggers for table: chapters
CREATE TRIGGER chapters_update_timestamp BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- Table: login_requests
CREATE TABLE IF NOT EXISTS login_requests (id uuid NOT NULL DEFAULT gen_random_uuid(), nid integer NOT NULL, user_id text NOT NULL, user_name text, requested_at text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), status text DEFAULT 'pending'::text);

-- Triggers for table: login_requests
CREATE TRIGGER login_requests_update_timestamp BEFORE UPDATE ON login_requests FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (id integer NOT NULL DEFAULT nextval('notifications_id_seq'::regclass), created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP, message text, link text, semester text);

-- Table: resources
CREATE TABLE IF NOT EXISTS resources (id uuid NOT NULL DEFAULT gen_random_uuid(), nid integer NOT NULL, unit_id integer, chapter_id integer, title text NOT NULL, url text NOT NULL, type text, order_index integer, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

-- Triggers for table: resources
CREATE TRIGGER resources_update_timestamp BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- Table: semesters
CREATE TABLE IF NOT EXISTS semesters (id uuid NOT NULL DEFAULT gen_random_uuid(), nid integer NOT NULL, name text NOT NULL, thumbnail text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

-- Triggers for table: semesters
CREATE TRIGGER semesters_update_timestamp BEFORE UPDATE ON semesters FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- Table: units
CREATE TABLE IF NOT EXISTS units (id uuid NOT NULL DEFAULT gen_random_uuid(), nid integer NOT NULL, chapter_id integer, name text NOT NULL, order_index integer, youtube_url text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

-- Triggers for table: units
CREATE TRIGGER units_update_timestamp BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- Table: videos
CREATE TABLE IF NOT EXISTS videos (id uuid NOT NULL DEFAULT gen_random_uuid(), nid integer NOT NULL, unit_id integer, title text NOT NULL, youtube_url text NOT NULL, order_index integer, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

-- Triggers for table: videos
CREATE TRIGGER videos_update_timestamp BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- Functions and Procedures
-- Function: approve_login_request
CREATE OR REPLACE FUNCTION public.approve_login_request(p_request_id integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    req record;
BEGIN
    SELECT * INTO req FROM login_requests WHERE id = p_request_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Request not found');
    END IF;

    UPDATE login_requests SET status = 'approved' WHERE id = p_request_id;
    UPDATE app_users SET extra_logins_allowed = extra_logins_allowed + 3 WHERE user_id = req.user_id;

    RETURN json_build_object('success', true);
END;
$function$
;

-- Function: hash_password_trigger
CREATE OR REPLACE FUNCTION public.hash_password_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF TG_OP = 'INSERT' OR NEW.password IS DISTINCT FROM OLD.password THEN
        NEW.password = crypt(NEW.password, gen_salt('bf'));
    END IF;
    RETURN NEW;
END;
$function$
;

-- Function: login_user
CREATE OR REPLACE FUNCTION public.login_user(login_user_id text, login_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    found_user record;
    new_token text;
    max_logins integer := 3;
BEGIN
    -- Find user (CASE-INSENSITIVE)
    SELECT id, user_id, name, role, password, 
           current_session_token, last_login_date, 
           login_count_today, extra_logins_allowed
    INTO found_user
    FROM app_users
    WHERE LOWER(user_id) = LOWER(login_user_id);

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Invalid user ID or password');
    END IF;

    -- Verify password
    IF found_user.password != crypt(login_password, found_user.password) THEN
        RETURN json_build_object('success', false, 'message', 'Invalid user ID or password');
    END IF;

    -- Reset daily count if it's a new day
    IF found_user.last_login_date IS DISTINCT FROM CURRENT_DATE THEN
        UPDATE app_users SET login_count_today = 0, extra_logins_allowed = 0, last_login_date = CURRENT_DATE
        WHERE id = found_user.id;
        found_user.login_count_today := 0;
        found_user.extra_logins_allowed := 0;
    END IF;

    -- Check daily login limit (skip for admins)
    IF found_user.role != 'admin' AND found_user.login_count_today >= (max_logins + found_user.extra_logins_allowed) THEN
        INSERT INTO login_requests (user_id, user_name, status)
        SELECT found_user.user_id, found_user.name, 'pending'
        WHERE NOT EXISTS (
            SELECT 1 FROM login_requests 
            WHERE user_id = found_user.user_id 
              AND status = 'pending'
              AND created_at::date = CURRENT_DATE
        );
        RETURN json_build_object('success', false, 'limit_reached', true, 
            'message', 'Daily login limit reached. Extension request sent to admin.');
    END IF;

    -- Generate new session token
    new_token := gen_random_uuid()::text;

    -- Update user: increment count, set new token
    UPDATE app_users 
    SET login_count_today = found_user.login_count_today + 1,
        current_session_token = new_token,
        last_login_date = CURRENT_DATE
    WHERE id = found_user.id;

    RETURN json_build_object(
        'success', true,
        'session_token', new_token,
        'session', json_build_object(
            'user', json_build_object(
                'id', found_user.id,
                'user_id', found_user.user_id,
                'name', found_user.name,
                'role', found_user.role
            )
        )
    );
END;
$function$
;

-- Function: reject_login_request
CREATE OR REPLACE FUNCTION public.reject_login_request(p_request_id integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE login_requests SET status = 'rejected' WHERE id = p_request_id;
    RETURN json_build_object('success', true);
END;
$function$
;

-- Function: save_user
CREATE OR REPLACE FUNCTION public.save_user(p_nid integer, p_user_id text, p_name text, p_role text, p_password text DEFAULT NULL::text, p_allowed_semesters text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_id uuid;
BEGIN
    -- Check if user exists by nid
    SELECT id INTO v_id FROM app_users WHERE nid = p_nid;

    IF v_id IS NOT NULL THEN
        -- UPDATE existing user
        IF p_password IS NOT NULL AND p_password != '' THEN
            UPDATE app_users 
            SET name = p_name,
                role = p_role,
                password = crypt(p_password, gen_salt('bf')),
                allowed_semesters = p_allowed_semesters,
                updated_at = now()
            WHERE id = v_id;
        ELSE
            UPDATE app_users 
            SET name = p_name,
                role = p_role,
                allowed_semesters = p_allowed_semesters,
                updated_at = now()
            WHERE id = v_id;
        END IF;
    ELSE
        -- INSERT new user
        -- For new users, we MUST have a password
        IF p_password IS NULL OR p_password = '' THEN
            RETURN json_build_object('success', false, 'message', 'Password is required for new users');
        END IF;

        INSERT INTO app_users (nid, user_id, name, role, password, allowed_semesters)
        VALUES (p_nid, p_user_id, p_name, p_role, crypt(p_password, gen_salt('bf')), p_allowed_semesters);
    END IF;

    RETURN json_build_object('success', true);
END;
$function$
;

-- Function: verify_session
CREATE OR REPLACE FUNCTION public.verify_session(p_user_id text, p_session_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    found_user record;
BEGIN
    SELECT user_id, current_session_token INTO found_user
    FROM app_users
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('valid', false, 'reason', 'User not found');
    END IF;

    IF found_user.current_session_token = p_session_token THEN
        RETURN json_build_object('valid', true);
    ELSE
        RETURN json_build_object('valid', false, 'reason', 'Session invalidated by another device');
    END IF;
END;
$function$
;

-- Sequences
CREATE SEQUENCE IF NOT EXISTS notifications_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 NO CYCLE;


