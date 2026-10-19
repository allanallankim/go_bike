'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { saddleStart, parseFitRecords, compareFit } = require('./bike-fit');
const record = {id:'a',date:'2026-10-19T00:00:00.000Z',height:710,tilt:0,setback:50,
  name:'Road',notes:'Test',inseam:80,bodyHeight:175,purpose:'Road',checks:['hips']};
test('converts inseam cm to a rounded reference height in mm', () => {
  assert.equal(saddleStart(80),706); assert.equal(saddleStart(85),751);
  for (const input of [NaN,Infinity,54,111,0]) assert.throws(()=>saddleStart(input),RangeError);
});
test('journal preserves optional empty values and zero measurements', () => {
  assert.deepEqual(parseFitRecords(null),[]);
  assert.deepEqual(parseFitRecords(JSON.stringify([record])),[record]);
  const minimal = {...record,tilt:null,setback:0,inseam:null,bodyHeight:null};
  assert.deepEqual(parseFitRecords(JSON.stringify([minimal])),[minimal]);
});
test('rejects corrupt journals rather than silently replacing records', () => {
  for (const raw of ['bad','{}','[null]',JSON.stringify([{...record,height:NaN}]),
    JSON.stringify([{...record,notes:{}}]),JSON.stringify([{...record,checks:['unknown']}]),
    JSON.stringify([{...record,date:'invalid'}]),JSON.stringify([{...record,tilt:100}])]) assert.throws(()=>parseFitRecords(raw));
});
test('compares changes with signed units and handles absent prior values', () => {
  const text = compareFit({...record,height:712,tilt:-0.5,setback:48},record);
  assert.ok(text.includes('+2mm')); assert.ok(text.includes('-0.5°')); assert.ok(text.includes('-2mm'));
  assert.ok(compareFit(record,null).includes('첫 기록'));
  assert.ok(!compareFit({...record,tilt:null},record).includes('기울기'));
});
