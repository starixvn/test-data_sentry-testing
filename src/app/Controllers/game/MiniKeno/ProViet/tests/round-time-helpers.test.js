const moment = require("moment");
const momentTz = require("moment-timezone");

const roundTimeHelper = require('./../round-time-helpers');

test('Latest round end time of day should be 21:55 (GMT+7)', () => {
    const mockTime = '2019-06-30T05:10:00+07:00';
    const date = new Date(mockTime);    
    const expectedRoundEndTime = moment(date).hours(21).minutes(55).seconds(0).milliseconds(0);

    const lastRoundEndTime = roundTimeHelper.lastRoundEndTime(date);

    expect(expectedRoundEndTime.isSame(lastRoundEndTime)).toBe(true);
});

test('Fisrt round end time of day should be 06:10 (GMT+7)', () => {
    const mockTime = '2019-06-30T05:10:00+07:00';
    const date = new Date(mockTime);    
    const expectedRoundEndTime = moment(date).hours(6).minutes(10).seconds(0).milliseconds(0);

    const fisrtRoundEndTime = roundTimeHelper.firstRoundEndTime(date);

    expect(expectedRoundEndTime.isSame(fisrtRoundEndTime)).toBe(true);
});

test('Running round end time at 06:30 AM, bet to round 08:00 AM (GMT+7)', () => {  
    const currentRoundEndTime =  '2020-06-30T23:40:00+00:00';
    const expectedRoundEndTime = moment(new Date('2020-07-01T01:00:00+00:00'));

    const roundEndTime = roundTimeHelper.generateRoundEndTime(27562, 27554, currentRoundEndTime);

    expect(expectedRoundEndTime.isSame(moment(roundEndTime))).toBe(true);
});

test('Running round end time at 06:20 PM, bet to first round 06:10 AM (GMT+7) tomorrow', () => {   
    const currentRoundEndTime = '2020-07-01T11:20:00+00:00';
    const expectedRoundEndTime = moment(new Date('2020-07-01T23:10:00+00:00'));

    const roundEndTime = roundTimeHelper.generateRoundEndTime(27741, 27719, currentRoundEndTime);

    expect(expectedRoundEndTime.isSame(moment(roundEndTime))).toBe(true);
});

test('Running round end time at 06:20 PM, bet to round 21:50 PM (GMT+7)', () => {   
    const currentRoundEndTime = '2020-07-01T11:20:00+00:00';
    const expectedRoundEndTime = moment(new Date('2020-07-01T14:50:00+00:00'));

    const roundEndTime = roundTimeHelper.generateRoundEndTime(27740, 27719, currentRoundEndTime);

    expect(expectedRoundEndTime.isSame(moment(roundEndTime))).toBe(true);
});