CREATE OR REPLACE FUNCTION public.send_push_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  push_token TEXT;
  announcement_title TEXT;
  announcement_body TEXT;
  http_response_status INT;
BEGIN
  SELECT expo_push_token INTO push_token FROM public.users WHERE id = NEW.user_id;

  SELECT title, LEFT(description, 100) INTO announcement_title, announcement_body
  FROM public.announcements WHERE id = NEW.announcement_id;

  IF push_token IS NOT NULL AND (push_token LIKE 'ExponentPushToken%' OR push_token LIKE 'ExpoPushToken%') THEN
    SELECT status INTO http_response_status FROM extensions.http_post(
      'https://exp.host/--/api/v2/push/send',
      json_build_array(
        json_build_object(
          'to', push_token,
          'title', COALESCE(announcement_title, 'New announcement'),
          'body', COALESCE(announcement_body, 'You have a new announcement.'),
          'sound', 'default',
          'priority', 'high',
          'channelId', 'default',
          'data', json_build_object(
            'type', 'announcement',
            'announcement_id', NEW.announcement_id
          )
        )
      )::text,
      'application/json'
    );

    INSERT INTO public.system_logs (action, details, user_email)
    VALUES ('PUSH_NOTIFICATION_ATTEMPT', 'Status: ' || http_response_status || ' sent to token: ' || push_token, 'system@trigger');
  ELSE
    INSERT INTO public.system_logs (action, details, user_email)
    VALUES ('PUSH_NOTIFICATION_SKIPPED', 'No valid token found for user_id: ' || NEW.user_id, 'system@trigger');
  END IF;

  RETURN NEW;
END;
$function$;
