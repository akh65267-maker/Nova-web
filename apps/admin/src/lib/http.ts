import { isAxiosError } from "axios";

// Whether a failed request was the server saying "there is no such thing" (as opposed to the
// network or the server failing), so a page can say "not found" rather than "try again".
export function isNotFound(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}
