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
 * Maximum recursion depth to prevent stack overflow
 */
const MAX_RECURSION_DEPTH = 100

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

	return matchRecursive(pattern, 0, value, 0, 0)
}

/**
 * Recursive matching with depth limit to prevent stack overflow
 */
const matchRecursive = (
	pattern: string,
	patternStart: number,
	value: string,
	valueStart: number,
	depth: number,
): boolean => {
	// Prevent stack overflow from deeply nested patterns
	if (depth >= MAX_RECURSION_DEPTH) {
		return false
	}

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
				if (matchRecursive(pattern, pIdx, value, vIdx, depth + 1)) {
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
