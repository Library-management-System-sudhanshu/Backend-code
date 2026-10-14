export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (
    !secret ||
    secret.length < 32 ||
    secret === 'studyflow_secret_key_12345'
  ) {
    throw new Error(
      'JWT_SECRET must be configured with at least 32 characters.',
    );
  }
  return secret;
}
