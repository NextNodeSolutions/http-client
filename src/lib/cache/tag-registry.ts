/**
 * Cache Tag Registry for Grouped Invalidation
 * @module lib/cache/tag-registry
 */

/**
 * Tag registry interface for cache invalidation
 */
export interface TagRegistry {
	/** Register a cache key with its associated tags */
	register(key: string, tags: readonly string[]): void
	/** Remove a key from all tag groups */
	unregister(key: string): void
	/** Get all keys associated with a tag */
	getKeysByTag(tag: string): ReadonlySet<string>
	/** Get all keys matching a URL pattern (glob-like) */
	getKeysByPattern(pattern: string): readonly string[]
	/** Clear all registrations */
	clear(): void
}

/**
 * Create tag registry for managing cache key associations
 * Uses Map and Set for O(1) operations
 */
export const createTagRegistry = (): TagRegistry => {
	// Tag -> Set of keys
	const tagToKeys = new Map<string, Set<string>>()
	// Key -> Set of tags (for efficient unregistration)
	const keyToTags = new Map<string, Set<string>>()
	// All registered keys (for pattern matching)
	const allKeys = new Set<string>()

	const register = (key: string, tags: readonly string[]): void => {
		if (tags.length === 0) return

		allKeys.add(key)

		// Get or create tag set for this key
		let existingTags = keyToTags.get(key)
		if (!existingTags) {
			existingTags = new Set()
			keyToTags.set(key, existingTags)
		}

		for (const tag of tags) {
			// Add to tag -> keys mapping
			let keysForTag = tagToKeys.get(tag)
			if (!keysForTag) {
				keysForTag = new Set()
				tagToKeys.set(tag, keysForTag)
			}
			keysForTag.add(key)

			// Add to key -> tags mapping
			existingTags.add(tag)
		}
	}

	const unregister = (key: string): void => {
		const tags = keyToTags.get(key)
		if (!tags) return

		// Remove key from all associated tag groups
		for (const tag of tags) {
			const keysForTag = tagToKeys.get(tag)
			if (keysForTag) {
				keysForTag.delete(key)
				// Clean up empty tag groups
				if (keysForTag.size === 0) {
					tagToKeys.delete(tag)
				}
			}
		}

		keyToTags.delete(key)
		allKeys.delete(key)
	}

	const getKeysByTag = (tag: string): ReadonlySet<string> =>
		tagToKeys.get(tag) ?? new Set()

	const getKeysByPattern = (pattern: string): readonly string[] => {
		// Convert glob pattern to regex
		// Escape special regex characters except * and ?
		const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
		// Convert glob * to regex .* and ? to .
		const regexPattern = escaped.replace(/\*/g, '.*').replace(/\?/g, '.')
		const regex = new RegExp(`^${regexPattern}$`)

		const matches: string[] = []
		for (const key of allKeys) {
			if (regex.test(key)) {
				matches.push(key)
			}
		}
		return matches
	}

	const clear = (): void => {
		tagToKeys.clear()
		keyToTags.clear()
		allKeys.clear()
	}

	return {
		register,
		unregister,
		getKeysByTag,
		getKeysByPattern,
		clear,
	}
}
