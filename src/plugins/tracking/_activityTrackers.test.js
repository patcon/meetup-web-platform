import { getLogger } from './activity';
import { getTrackActivity, getTrackApiResponses } from './_activityTrackers';
jest.mock('uuid', () => {
	return {
		v4: () => 'test-v4-uuid',
	};
});

describe('getTrackActivity', () => {
	it('records the expected object', () => {
		const logger = getLogger('MUP_WEB');
		const trackOpts = {
			memberCookieName: 'member',
			log: logger,
		};
		const memberId = 1337;
		const request = {
			id: 'test-request-id-1234',
			url: {
				pathname: '/mu_api',
			},
			headers: {
				'user-agent': 'test user agent',
			},
			method: 'get',
			payload: '',
			query: {},
			info: {
				referrer: 'http://example.com/referrer',
			},
			plugins: {
				tracking: {},
			},
			state: {
				member: `id=${memberId}&status=1`,
			},
		};
		request.trackApiResponses = getTrackApiResponses(trackOpts)(request);
		const trackActivity = getTrackActivity(trackOpts);
		const trackRequestActivity = trackActivity(request);
		const queryResponses = [];
		expect(trackRequestActivity(queryResponses)).toMatchSnapshot();
	});
});
