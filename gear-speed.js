'use strict';
const GEAR_CONFIGS = {
  shimano11: { name: '시마노 11단', speeds: 11,
    cassettes: { '11-34': [11,13,15,17,19,21,23,25,27,30,34] }, rings: [[50,34],[52,36],[53,39]] },
  shimano12: { name: '시마노 12단', speeds: 12, cassettes: {
    '11-34': [11,12,13,14,15,17,19,21,24,27,30,34],
    '11-30': [11,12,13,14,15,16,17,19,21,24,27,30],
    '11-36': [11,12,13,14,15,17,19,21,24,28,32,36]
  }, rings: [[50,34],[52,36],[54,40]] },
  sram12: { name: '스램 12단 (로드 AXS)', speeds: 12, cassettes: {
    '10-30': [10,11,12,13,14,15,17,19,21,24,27,30],
    '10-28': [10,11,12,13,14,15,16,17,19,21,24,28],
    '10-33': [10,11,12,13,14,15,17,19,21,24,28,33],
    '10-36': [10,11,12,13,15,17,19,21,24,28,32,36]
  }, rings: [[46,33],[48,35],[50,37],[43,30]] }
};
function calculateGearSpeed(chainring, sprocket, cadence, circumference) {
  if (![chainring,sprocket,cadence,circumference].every(Number.isFinite) ||
      !Number.isInteger(chainring) || chainring < 20 || chainring > 70 ||
      !Number.isInteger(sprocket) || sprocket < 1 || sprocket > 60 ||
      !Number.isInteger(cadence) || cadence < 1 || cadence > 250 ||
      !Number.isInteger(circumference) || circumference < 1000 || circumference > 3000) {
    throw new RangeError('체인링 20~70T, 케이던스 1~250rpm, 바퀴 둘레 1,000~3,000mm 범위의 정수를 입력하세요.');
  }
  const ratio = chainring / sprocket;
  return { ratio, speed: ratio * cadence * circumference * 60 / 1000000 };
}
if (typeof module !== 'undefined') module.exports = { GEAR_CONFIGS, calculateGearSpeed };
if (typeof document !== 'undefined') {
  const el = id => document.getElementById(id);
  const form = el('gear-form'), drive = el('drivetrain'), cassette = el('cassette'), preset = el('chainring-preset');
  const small = el('small-ring'), large = el('large-ring'), result = el('gear-result'), error = el('gear-error');
  function setOptions(select, entries) { select.replaceChildren(...entries.map(([value,label]) => new Option(label,value))); }
  function applyPreset() { if (preset.value !== 'custom') { const [big,little] = preset.value.split('/'); large.value = big; small.value = little; } }
  function updateConfig() {
    const config = GEAR_CONFIGS[drive.value];
    setOptions(cassette, Object.keys(config.cassettes).map(key => [key,`${key}T`]));
    setOptions(preset, [...config.rings.map(rings => [rings.join('/'),`${rings.join('/')}T`]), ['custom','직접 입력']]);
    applyPreset();
  }
  function render() {
    result.hidden = true; error.hidden = true;
    if (!form.checkValidity()) return;
    try {
      const config = GEAR_CONFIGS[drive.value], cogs = config.cassettes[cassette.value];
      const rings = [Number(small.value),Number(large.value)];
      if (rings[0] >= rings[1]) throw new RangeError('작은 체인링은 큰 체인링보다 톱니 수가 적어야 합니다.');
      const cadence = Number(el('cadence').value), circumference = Number(el('circumference').value);
      const rows = cogs.map(cog => rings.map(ring => calculateGearSpeed(ring,cog,cadence,circumference)));
      el('gear-summary').textContent = `${config.name} · ${cassette.value}T · ${rings[1]}/${rings[0]}T · ${cadence} rpm · 바퀴 둘레 ${circumference.toLocaleString()} mm`;
      el('table-caption').textContent = `${cogs.join(' · ')}T (총 ${cogs.length}단)`;
      for (const [i,id] of ['small-range','large-range'].entries()) el(id).textContent = `${rows.at(-1)[i].speed.toFixed(1)} ~ ${rows[0][i].speed.toFixed(1)} km/h`;
      const head = document.createElement('tr');
      for (const label of ['단수','스프라켓',`${rings[0]}T 기어비`,`${rings[0]}T 속도 (km/h)`,`${rings[1]}T 기어비`,`${rings[1]}T 속도 (km/h)`]) {
        const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = label; head.append(cell);
      }
      el('gear-head').replaceChildren(head);
      el('gear-rows').replaceChildren(...rows.map((row,i) => {
        const tr = document.createElement('tr');
        [`${i+1}`,`${cogs[i]}T`,row[0].ratio.toFixed(3),row[0].speed.toFixed(2),row[1].ratio.toFixed(3),row[1].speed.toFixed(2)].forEach((value,j) => {
          const cell = document.createElement('td'); cell.textContent = value; if (j===3 || j===5) cell.className = 'speed'; tr.append(cell);
        }); return tr;
      })); result.hidden = false;
    } catch (err) { error.textContent = err.message; error.hidden = false; }
  }
  drive.addEventListener('change', () => { updateConfig(); render(); });
  preset.addEventListener('change', () => { applyPreset(); render(); });
  for (const input of [small,large]) input.addEventListener('input', () => { preset.value = 'custom'; });
  form.addEventListener('input', render); form.addEventListener('change', render);
  form.addEventListener('submit', event => { event.preventDefault(); if (form.reportValidity()) render(); });
  updateConfig(); render();
}
