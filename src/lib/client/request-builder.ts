/**
 * Request Builder
 * @module lib/client/request-builder
 */

import {
	buildUrl,
	createJsonHeaders,
	generateRequestId,
	mergeHeaders,
} from '../../utils/index.js'

import type {
	HttpClientConfig,
	RequestConfig,
	RequestContext,
	RequestOptions,
} from '../../types/index.js'

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

/**
 * Create RequestConfig from HTTP method call
 */
export const createRequestConfig = (
	method: RequestConfig['method'],
	url: string,
	body: unknown | undefined,
	options: RequestOptions | undefined,
): RequestConfig => ({
	method,
	url,
	body,
	...options,
})
