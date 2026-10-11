const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export type DecodedToken = {
  sub: string;
  email: string;
  exp: number;
  [ROLE_CLAIM]?: string;
};

export function decodeJwt(token: string): DecodedToken | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as DecodedToken;
  } catch {
    return null;
  }
}

export function getRole(token: string): string | null {
  return decodeJwt(token)?.[ROLE_CLAIM] ?? null;
}
