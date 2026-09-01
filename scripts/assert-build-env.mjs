const key = process.env.SUPABASE_ANON_KEY?.trim();

if (!key || !/^sb_publishable_[A-Za-z0-9_]{20,}$/.test(key)) {
  console.error(
    'Build stopped: SUPABASE_ANON_KEY must contain the public Supabase publishable key.',
  );
  process.exit(1);
}

console.log('Build environment: public licence key present');
