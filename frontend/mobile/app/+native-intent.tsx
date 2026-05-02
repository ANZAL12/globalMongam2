/**
 * Rewrites provider deep links before Expo Router resolves a route.
 * This prevents OAuth callback URLs like:
 *   global-agencies://oauth2redirect?code=...
 * from being treated as unknown routes.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
    try {
        const normalized = String(path || "").toLowerCase();

        // OAuth callback paths used by Google + expo-auth-session.
        if (
            normalized.includes("oauth2redirect") ||
            normalized.includes("oauthredirect")
        ) {
            return "/login";
        }

        return path;
    } catch {
        // Never crash inside native intent handling.
        return "/login";
    }
}
