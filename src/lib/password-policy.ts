/** Keep in sync with Supabase Auth password settings (length + optional character rules). */
export const WEB_PASSWORD_MIN_LENGTH = 6

export function meetsSupabaseStylePasswordRules(password: string): boolean {
  return (
    /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password)
  )
}
