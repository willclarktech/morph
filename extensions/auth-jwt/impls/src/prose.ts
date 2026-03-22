/**
 * Prose templates for Auth-JWT operations.
 *
 * This file is a FIXTURE - hand-written, survives regeneration.
 * Provides human-readable templates for test output and feature files.
 */

export const prose: Record<string, string> = {
	signToken: '{actor} signs a JWT token for user "{sub}"',
	verifyToken: "{actor} verifies the JWT token",
	refreshToken: "{actor} refreshes the JWT token",
};
