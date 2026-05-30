/** Decodes user id and roles from a JWT payload without validating its signature. */
export function decodeToken(token: string): { id: string; roles: string[] } | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return { id: decoded.id ?? decoded.sub ?? '', roles: decoded.roles ?? [] }
  } catch {
    return null
  }
}
