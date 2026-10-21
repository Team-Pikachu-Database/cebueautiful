export function normalizeDatabaseUrl(value, variableName = "DATABASE_URL") {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `${variableName} must be a valid PostgreSQL connection URI. Check the Supabase host, port, and URL-encoded password.`
    );
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    !url.username ||
    !url.password
  ) {
    throw new Error(
      `${variableName} must include a PostgreSQL host, username, and password.`
    );
  }

  for (const parameter of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) {
    url.searchParams.delete(parameter);
  }

  return url.toString();
}
