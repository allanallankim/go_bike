'use strict';

// Service-specific estimate, not a manufacturer's pressure recommendation.
function calculatePressure(riderWeight, bikeWeight, tireType, tireWidth) {
  if (!Number.isFinite(riderWeight) || riderWeight < 30 || riderWeight > 150 ||
      !Number.isFinite(bikeWeight) || bikeWeight < 4 || bikeWeight > 30 ||
      !['tubeless', 'clincher'].includes(tireType) || ![25, 28, 30].includes(tireWidth)) {
    throw new RangeError('몸무게는 30~150 kg, 자전거 무게는 4~30 kg으로 입력하고 타이어 종류와 폭을 선택하세요.');
  }
  const totalWeight = riderWeight + bikeWeight;
  const base = 75 * (totalWeight / 80) * (28 / tireWidth) ** 2 * (tireType === 'tubeless' ? 0.9 : 1);
  return { totalWeight, front: base * 0.9, rear: base * 1.1 };
}

if (typeof module !== 'undefined') module.exports = { calculatePressure };

if (typeof document !== 'undefined') {
  const form = document.getElementById('pressure-form');
  const result = document.getElementById('pressure-result');
  const error = document.getElementById('form-error');
  form.addEventListener('input', () => {
    result.hidden = true;
    error.hidden = true;
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    result.hidden = true;
    error.hidden = true;
    if (!form.reportValidity()) return;
    try {
      const data = new FormData(form);
      const width = Number(data.get('tireWidth'));
      const type = data.get('tireType');
      const pressure = calculatePressure(Number(data.get('riderWeight')), Number(data.get('bikeWeight')), type, width);
      for (const wheel of ['front', 'rear']) {
        document.getElementById(`${wheel}-psi`).textContent = `${pressure[wheel].toFixed(1)} PSI`;
        document.getElementById(`${wheel}-bar`).textContent = `${(pressure[wheel] / 14.5037738).toFixed(2)} bar`;
      }
      document.getElementById('pressure-summary').textContent = `총 무게 ${pressure.totalWeight.toFixed(1)} kg · ${type === 'tubeless' ? '튜블리스' : '클린처'} · ${width}c`;
      result.hidden = false;
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
    }
  });
}
