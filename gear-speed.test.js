'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { GEAR_CONFIGS, calculateGearSpeed: calc } = require('./gear-speed');

test('matches the supplied workbook cached values', () => {
  const fixtures = [[34,11,32.209745454545448],[50,11,47.367272727272727],
    [34,13,27.2544],[50,13,40.08],[34,34,10.4208],[50,34,15.324705882352943]];
  for (const [ring,cog,speed] of fixtures) assert.ok(Math.abs(calc(ring,cog,80,2171).speed-speed) < 1e-10);
  assert.equal(calc(34,34,80,2171).ratio,1);
});
test('all cassette presets have the correct count, increasing cogs and decreasing speeds', () => {
  for (const config of Object.values(GEAR_CONFIGS)) for (const [name,cogs] of Object.entries(config.cassettes)) {
    assert.equal(cogs.length, config.speeds);
    assert.equal(name,`${cogs[0]}-${cogs.at(-1)}`);
    for (let i=1;i<cogs.length;i++) assert.ok(cogs[i] > cogs[i-1]);
    for (const rings of config.rings) for (const ring of rings) {
      const speeds = cogs.map(cog=>calc(ring,cog,80,2171).speed);
      assert.ok(speeds.every(Number.isFinite));
      for (let i=1;i<speeds.length;i++) assert.ok(speeds[i] < speeds[i-1]);
    }
  }
});
test('speed scales with cadence and circumference', () => {
  assert.equal(calc(50,25,80,2000).speed,19.2);
  assert.equal(calc(50,25,160,2000).speed,38.4);
  assert.equal(calc(50,25,80,3000).speed,28.8);
});
test('rejects invalid inputs instead of returning invalid results', () => {
  for (const args of [[0,11,80,2171],[50,0,80,2171],[50,11,0,2171],
    [50,11,NaN,2171],[50,11,251,2171],[50,11,80,999],
    [50.5,11,80,2171],[50,11,80,Infinity]]) assert.throws(()=>calc(...args),RangeError);
});
