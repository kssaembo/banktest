/** Authorization belongs to a user, not to each refreshed access token. */
export function sameAuthUser(previous: { user: { id: string } } | null | undefined, next: { user: { id: string } } | null): boolean {
  return previous !== undefined && (previous?.user.id ?? null) === (next?.user.id ?? null);
}
