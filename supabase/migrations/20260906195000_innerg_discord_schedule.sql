create extension if not exists pg_cron;
-- A private server job reconciles linked members every minute. No member IDs are credentials.
select cron.schedule('innerg-discord-role-sync','* * * * *', $job$
  select net.http_post(
    url := 'https://zkyhhoxcrjkhywblzehr.supabase.co/functions/v1/innerg-discord',
    headers := jsonb_build_object('Content-Type','application/json','x-worker-secret',
      (select decrypted_secret from vault.decrypted_secrets where name='innerg_discord_worker')),
    body := '{"action":"worker"}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);
