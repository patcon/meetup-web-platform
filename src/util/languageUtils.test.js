import querystring from 'querystring';
import url from 'url';
import {
	getCookieLang,
	getUrlLang,
	getBrowserLang,
	getLanguage,
	checkLanguageRedirect,
} from './languageUtils';

const rootUrl = 'http://example.com/';
const MOCK_HAPI_REQUEST = {
	log() {},
	url: url.parse(rootUrl),
	headers: {},
	state: {},
};
const MOCK_HAPI_REPLY = {
	redirect() {},
};
const defaultLang = 'en-US';
const altLang = 'fr-FR';
const altLang2 = 'de-DE';
const altLang3 = 'es-ES';
const supportedLangs = [defaultLang, altLang, altLang2, altLang3];
describe('getCookieLang', () => {
	it('returns undefined when no cookie in state', () => {
		const request = { ...MOCK_HAPI_REQUEST };
		const lang = getCookieLang(request, supportedLangs);
		expect(lang).toBeUndefined();
	});
	it('returns supported MEETUP_LANGUAGE cookie when present', () => {
		const MEETUP_LANGUAGE = querystring.stringify({
			country: 'FR',
			language: 'fr',
		});
		const request = { ...MOCK_HAPI_REQUEST, state: { MEETUP_LANGUAGE } };
		const lang = getCookieLang(request, supportedLangs);
		expect(lang).toEqual(altLang);
	});
});
describe('getUrlLang', () => {
	it('returns false for unsupported lang in url', () => {
		const requestLang = 'this-isnt-even-a-language';
		const request = { ...MOCK_HAPI_REQUEST, url: url.parse(`${rootUrl}${requestLang}/`) };
		const lang = getUrlLang(request, supportedLangs);
		expect(lang).toBe(false);
	});
	it('returns supported language from URL pathname, if present', () => {
		const requestLang = altLang;
		const request = { ...MOCK_HAPI_REQUEST, url: url.parse(`${rootUrl}${requestLang}/`) };
		const lang = getUrlLang(request, supportedLangs);
		expect(lang).toEqual(requestLang);
	});
});
describe('getBrowserLang', () => {
	it('returns false for unsupported browser language', () => {
		const acceptLang = 'this-isnt-even-a-language';
		const request = { ...MOCK_HAPI_REQUEST, headers: { 'accept-language': acceptLang } };
		const lang = getBrowserLang(request, supportedLangs);
		expect(lang).toBe(false);
	});
	it('returns supported language from brower "Accept-Language" header, if present', () => {
		const acceptLang = altLang;
		const request = { ...MOCK_HAPI_REQUEST, headers: { 'accept-language': acceptLang } };
		const lang = getBrowserLang(request, supportedLangs);
		expect(lang).toEqual(acceptLang);
	});
});
describe('getLanguage', () => {
	it('returns default language if no supported lang or URL pathname prefix', () => {
		const lang = getLanguage(MOCK_HAPI_REQUEST, supportedLangs, defaultLang);
		expect(lang).toEqual(defaultLang);
	});
});
describe('checkLanguageRedirect', () => {
	function getRedirect({ requestLang, requestUrl }) {
		const request = { ...MOCK_HAPI_REQUEST, url: url.parse(requestUrl) };
		return checkLanguageRedirect(request, MOCK_HAPI_REPLY, requestLang, supportedLangs, defaultLang);
	}
	function expectRedirect(options) {
		if (options.expectedRedirect) {
			expect(getRedirect(options)).not.toBeNull();
			expect(MOCK_HAPI_REPLY.redirect.calls.mostRecent().args).toEqual([options.expectedRedirect]);
		} else {
			expect(getRedirect(options)).toBeNull();
			expect(MOCK_HAPI_REPLY.redirect).not.toHaveBeenCalled();
		}
	}
	function testRedirect(options) {
		expectRedirect(options);

		options.requestUrl = `${options.requestUrl}foo`;
		options.expectedRedirect = options.expectedRedirect && `${options.expectedRedirect}foo`;
		expectRedirect(options);
	}
	beforeEach(() => {
		spyOn(MOCK_HAPI_REPLY, 'redirect');
	});

	it('calls redirect to root path when default lang requested', () =>
		testRedirect({
			requestLang: defaultLang,
			requestUrl: `${rootUrl}${defaultLang}/`,
			expectedRedirect: rootUrl,
		})
	);
	it('calls redirect to requestLanguage path from incorrect language path', () => {
		const requestLang = altLang;
		supportedLangs.filter(l => l !== altLang).forEach(lang =>
			testRedirect({
				requestLang,
				requestUrl: `${rootUrl}${lang}/`,
				expectedRedirect: `${rootUrl}${requestLang}/`
			})
		);
	});
	it('calls redirect to path with requestLanguage injected if missing', () => {
		const requestLang = altLang;
		testRedirect({
			requestLang,
			requestUrl: rootUrl,
			expectedRedirect: `${rootUrl}${requestLang}/`,
		});
	});
	it('does not redirect if non-default language requested on correct language path', () => {
		const requestLang = altLang;
		testRedirect({
			requestLang,
			requestUrl: `${rootUrl}${requestLang}/`,
			expectedRedirect: false,
		});
	});
	it('ignores unsupported language prefixes', () => {
		const requestLang = 'asdfasdf';
		testRedirect({
			requestLang,
			requestUrl: `${rootUrl}${requestLang}/`,
			expectedRedirect: false,
		});
	});
});
