import Joi from 'joi';

/**
 * @module authUtils
 */

const YEAR_IN_MS = 1000 * 60 * 60 * 24 * 365;

/**
 * Transform auth info from the API into a configuration for the corresponding
 * cookies to write into the Hapi request/response
 *
 * @param {Object} auth { oauth_token || access_token, refresh_token, expires_in }
 * object from API/Auth endpoint
 */
export const configureAuthState = auth => {
	return {
		oauth_token: {
			value: auth.oauth_token || auth.access_token,
			opts: {
				ttl: auth.expires_in * 1000,
			},
		},
		refresh_token: {
			value: auth.refresh_token,
			opts: {
				ttl: YEAR_IN_MS * 2,
			},
		}
	};
};

/**
 * Both the incoming request and the outgoing response need to have an
 * 'authorized' state in order for the app to render correctly with data from
 * the API, so this function modifies the request and the reply
 *
 * @param request Hapi request
 * @param auth { oauth_token || access_token, expires_in (seconds), refresh_token }
 */
export const applyAuthState = (request, reply) => auth => {
	// there are secret tokens in `auth`, be careful with logging
	const authState = configureAuthState(auth);
	const authCookies = Object.keys(authState);

	request.log(['auth', 'info'], `Setting auth cookies: ${JSON.stringify(authCookies)}`);
	Object.keys(authState).forEach(name => {
		const cookieVal = authState[name];
		// apply to request
		request.state[name] = cookieVal.value;
		// apply to response - note this special `request.authorize.reply` prop assigned onPreAuth
		reply.state(name, cookieVal.value, cookieVal.opts);
	});
	return request;
};

export const removeAuthState = (names, request, reply) => {
	names.forEach(name => {
		request.state[name] = null;
		reply.unstate(name);
	});
};

function validateOptions(options) {
	const optionsSchema = Joi.object({
		password: Joi.string().min(32),
	});
	const { value, error } = Joi.validate(options, optionsSchema);
	if (error) {
		throw error;
	}
	return value;
}

export const applyServerState = (server, options) => {
	options = validateOptions(options);
	const authCookieOptions = {
		encoding: 'iron',
		password: options.COOKIE_ENCRYPT_SECRET,
		// isSecure: process.env.NODE_ENV === 'production',   // enable when SSL is active
		path: '/',
		isHttpOnly: true,
		clearInvalid: true,
	};
	server.state('oauth_token', authCookieOptions);
	server.state('refresh_token', authCookieOptions);
};

