import avro from 'avsc';
import GoodMeetupTracking from './good-meetup-tracking';
import Stream from 'stream';

import { logTrack } from '../util/tracking';

const testTransform = (tracker, trackInfo, test) =>
	new Promise((resolve, reject) => {
		tracker._transform({ data: JSON.stringify(trackInfo) }, null, (err, val) => {
			if (err) {
				reject(err);
			}
			resolve(val);
		});
	})
	.then(test);

describe('GoodMeetupTracking', () => {
	it('creates a transform stream', () => {
		expect(new GoodMeetupTracking() instanceof Stream.Transform).toBe(true);
	});
	it('transforms input into avro Buffer', () => {
		const config = {
			schema: avro.parse({
				type: 'record',
				fields: [
					{ name: 'requestId', type: 'string'},
				]
			}),
		};
		const tracker = new GoodMeetupTracking(config);
		const trackInfo = { requestId: 'foo' };
		return testTransform(
			tracker,
			trackInfo,
			val => {
				expect(val instanceof Buffer).toBe(true);
				expect(tracker._settings.schema.fromBuffer(val)).toEqual(trackInfo);
			}
		);
	});
});

describe('Integration with tracking logs', () => {
	const response = {
		request: {
			headers: {},
			log() {}
		}
	};
	const trackInfo = logTrack('WEB')(response, {
		memberId: 1234,
		trackId: 'foo',
		sessionId: 'bar',  // not part of v3 spec
		url: 'asdf',
	});

	it('encodes standard output from logTrack', () => {
		const tracker = new GoodMeetupTracking();

		return testTransform(
			tracker,
			trackInfo,
			val => {
				expect(val instanceof Buffer).toBe(true);
				const trackedInfo = tracker._settings.schema.fromBuffer(val);
				const expectedTrackInfo = {
					...trackInfo,
					aggregratedUrl: ''  // misspelled, unused field in v3 spec
				};
				delete expectedTrackInfo.sessionId;  // not part of v3 spec
				expect(trackedInfo).toEqual(expectedTrackInfo);
			}
		);
	});

});

