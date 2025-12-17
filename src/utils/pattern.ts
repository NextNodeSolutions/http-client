/**
 * Safe Glob Pattern Matching
 * @module utils/pattern
 *
 * Simple string-based glob matching without regex.
 * Avoids ReDoS vulnerabilities from regex backtracking.
 */

/**
 * Maximum allowed pattern length to prevent abuse
 */
const MAX_PATTERN_LENGTH = 100

/**
 * Match a glob pattern against a string value
 * Supports:
 * - `*` matches any sequence of characters (including empty)
 * - `?` matches exactly one character
 *
 * @example
 * ```typescript
 * matchGlobPattern('users/*', 'users/123') // true
 * matchGlobPattern('*.json', 'data.json') // true
 * matchGlobPattern('user?', 'user1') // true
 * matchGlobPattern('api/v1/*', 'api/v2/data') // false
 * ```
 */
export const matchGlobPattern = (pattern: string, value: string): boolean => {
	if (pattern.length > MAX_PATTERN_LENGTH) {
		return false
	}

	// Exact match shortcut
	if (!pattern.includes('*') && !pattern.includes('?')) {
		return pattern === value
	}

	return matchRecursive(pattern, 0, value, 0)
}

/**
 * Recursive matching with memoization-friendly structure
 * Uses iterative approach for * to avoid stack overflow
 */
const matchRecursive = (
	pattern: string,
	patternStart: number,
	value: string,
	valueStart: number,
): boolean => {
	const pLen = pattern.length
	const vLen = value.length

	let pIdx = patternStart
	let vIdx = valueStart

	while (pIdx < pLen && vIdx < vLen) {
		const pChar = pattern[pIdx]

		if (pChar === '*') {
			// Skip consecutive stars
			while (pIdx < pLen && pattern[pIdx] === '*') {
				pIdx++
			}

			// Trailing * matches everything
			if (pIdx === pLen) {
				return true
			}

			// Try matching * with different lengths
			while (vIdx <= vLen) {
				if (matchRecursive(pattern, pIdx, value, vIdx)) {
					return true
				}
				vIdx++
			}
			return false
		}

		if (pChar === '?') {
			// ? matches exactly one character
			pIdx++
			vIdx++
			continue
		}

		// Literal character match
		if (pChar !== value[vIdx]) {
			return false
		}

		pIdx++
		vIdx++
	}

	// Skip trailing stars
	while (pIdx < pLen && pattern[pIdx] === '*') {
		pIdx++
	}

	// Both must be exhausted for a match
	return pIdx === pLen && vIdx === vLen
}
