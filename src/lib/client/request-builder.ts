/**
 * Request Builder
 * @module lib/client/request-builder
 */

import type {
	HttpClientConfig,
	RequestConfig,
	RequestContext,
} from '../../types/index.js'
import {
	buildUrl,
	createJsonHeaders,
	generateRequestId,
	mergeHeaders,
} from '../../utils/index.js'

/**
 * Build request context from config and options
 */
export const buildRequestContext = (
	config: RequestConfig,
	clientConfig: HttpClientConfig,
): RequestContext => {
	const requestId = config.requestId ?? generateRequestId()
	const timeout = config.timeout ?? clientConfig.timeout ?? 30000

	// Build URL
	const url = buildUrl(clientConfig.baseUrl ?? '', config.url, config.params)

	// Merge headers (JSON defaults <- client defaults <- request headers)
	const headers = mergeHeaders(
		createJsonHeaders(),
		clientConfig.headers,
		config.headers,
	)

	const context: RequestContext = {
		url,
		method: config.method,
		headers,
		body: config.body,
		requestId,
		timestamp: Date.now(),
		timeout,
	}

	// Only add signal if provided (satisfies exactOptionalPropertyTypes)
	if (config.signal) {
		return { ...context, signal: config.signal }
	}

	return context
}
