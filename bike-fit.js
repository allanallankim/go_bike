'use strict';
const FIT_STORAGE_KEY = 'cycling-helper-fit-v1';
function saddleStart(inseam) {
  if (!Number.isFinite(inseam) || inseam < 55 || inseam > 110) throw new RangeError('인심은 55~110cm 범위로 입력하세요.');
  return Math.round(inseam * 10 * 0.883);
}
function parseFitRecords(raw) {
  if (raw === null) return [];
  const records = JSON.parse(raw);
  const optionalNumber = (value,min,max) => value === null || (Number.isFinite(value) && value >= min && value <= max);
  if (!Array.isArray(records) || records.length > 200 || records.some(r =>
    !r || typeof r.id !== 'string' || typeof r.date !== 'string' || !Number.isFinite(Date.parse(r.date)) ||
    !Number.isFinite(r.height) || r.height < 400 || r.height > 1100 ||
    !optionalNumber(r.tilt,-20,20) || !optionalNumber(r.setback,-100,250) ||
    typeof r.name !== 'string' || r.name.length > 60 || typeof r.notes !== 'string' || r.notes.length > 1000 ||
    !optionalNumber(r.inseam,55,110) || !optionalNumber(r.bodyHeight,130,220) ||
    typeof r.purpose !== 'string' || r.purpose.length > 50 ||
    !Array.isArray(r.checks) || r.checks.some(c => !['hips','reach','slide','pain'].includes(c))
  )) throw new Error('저장된 기록 형식을 확인할 수 없습니다. 기존 데이터 보호를 위해 저장을 중지했습니다.');
  return records;
}
function compareFit(current, previous) {
  if (!previous) return '이 자전거의 첫 기록입니다.';
  const parts = [['height','안장 높이','mm'],['tilt','기울기','°'],['setback','후퇴량','mm']].flatMap(([key,label,unit]) => {
    if (current[key] === null || previous[key] === null) return [];
    const diff = Math.round((current[key]-previous[key])*10)/10;
    return [`${label} ${diff > 0 ? '+' : ''}${diff}${unit}`];
  });
  return `같은 자전거의 직전 기록 대비: ${parts.join(' · ')}`;
}
if (typeof module !== 'undefined') module.exports = { saddleStart, parseFitRecords, compareFit };
if (typeof document !== 'undefined') {
  const el = id => document.getElementById(id);
  const optional = id => el(id).value.trim() === '' ? null : Number(el(id).value);
  const form = el('fit-form'), result = el('fit-result'), error = el('fit-error'), status = el('storage-status');
  let records = [], storageOK = true, storedRaw = null;
  function load() {
    try { storedRaw = localStorage.getItem(FIT_STORAGE_KEY); records = parseFitRecords(storedRaw); }
    catch (err) { storageOK = false; status.textContent = '저장소에 접근할 수 없거나 기존 기록 형식을 읽을 수 없습니다. 기존 데이터 보호를 위해 새 저장을 중지했습니다. 계산·점검은 계속 이용할 수 있습니다.'; }
  }
  function persist(next) {
    if (!storageOK) { status.textContent = '기록 저장이 중지된 상태입니다. 기존 기록을 내보내거나 브라우저의 저장 권한을 확인하세요.'; return false; }
    try {
      // Refuse to overwrite a journal changed in another tab.
      if (localStorage.getItem(FIT_STORAGE_KEY) !== storedRaw) {
        status.textContent = '다른 탭에서 기록이 변경되었습니다. 이 페이지를 새로고침한 뒤 저장하세요.'; return false;
      }
      const raw = JSON.stringify(next);
      localStorage.setItem(FIT_STORAGE_KEY,raw); storedRaw = raw; records = next; return true;
    } catch (err) { status.textContent = '저장하지 못했습니다. 브라우저 저장 권한이나 용량을 확인하세요. 입력 내용은 유지됩니다.'; return false; }
  }
  form.addEventListener('input', () => { result.hidden = true; error.hidden = true; });
  form.addEventListener('submit', event => {
    event.preventDefault(); result.hidden = true; error.hidden = true;
    if (!form.reportValidity()) return;
    try {
      const inseam = Number(el('fit-inseam').value), bodyHeight = optional('fit-height');
      if (bodyHeight !== null && inseam >= bodyHeight) throw new RangeError('인심이 키보다 짧은지 측정값을 확인하세요.');
      const height = saddleStart(inseam), current = optional('fit-current');
      el('fit-value').textContent = `${height} mm`;
      el('fit-difference').textContent = current === null ? '현재 높이 미입력' : `시작값이 ${Math.abs(height-current)} mm ${height >= current ? '높음' : '낮음'}`;
      const purpose = el('fit-purpose').value;
      el('purpose-advice').textContent = purpose === '편안한 장거리' ? '장거리 목적: 짧은 시승에서 편안함을 먼저 확인하고 주행 시간을 늘리며 점검하세요.' : purpose === '일상 주행' ? '일상 주행 목적: 페달링뿐 아니라 출발·정차 때의 안정감도 확인하세요.' : '스포츠 주행 목적: 낮은 자세를 억지로 유지하지 말고 힘을 내면서 골반과 상체를 안정적으로 유지할 수 있는지 확인하세요.';
      result.hidden = false;
    } catch (err) { error.textContent = err.message; error.hidden = false; }
  });
  const advice = {
    hips: '골반 흔들림: 측정값과 안장 높이, 발이 페달에 닿는 느낌을 함께 확인하세요. 높이만이 원인이라고 단정하지 마세요.',
    reach: '상체 긴장: 팔꿈치·손목·어깨의 힘을 확인하고 핸들까지의 거리와 높이를 점검하세요. 안장을 앞으로 옮기는 것만으로 해결하려 하지 마세요.',
    slide: '앞으로 미끄러짐: 안장 기울기와 앉는 위치를 확인하세요. 안장 모양·의류·핸들 거리도 영향을 줄 수 있습니다.',
    pain: '통증·저림: 조정이나 라이딩을 계속 밀어붙이지 마세요. 증상이 지속되거나 반복되면 의료 전문가에게 상담하고, 세팅은 전문 피터와 확인하세요.'
  };
  const checked = () => [...document.querySelectorAll('.checks input:checked')].map(input => input.value);
  document.querySelectorAll('.checks input').forEach(input => input.addEventListener('change', () => {
    el('fit-advice').textContent = checked().map(key => advice[key]).join('\n\n') || '항목을 선택하면 점검할 내용을 보여드립니다.';
  }));
  function addText(parent, text, tag = 'p') { const node = document.createElement(tag); node.textContent = text; parent.append(node); }
  function renderRecords() {
    const container = el('fit-records'); container.replaceChildren();
    if (!records.length) addText(container,'아직 저장된 기록이 없습니다.');
    records.forEach((record,i) => {
      const article = document.createElement('article'); article.className = 'record';
      addText(article,`${new Date(record.date).toLocaleString('ko-KR')} · ${record.name || '이름 미입력 자전거'}`,'h3');
      addText(article,`안장 높이 ${record.height}mm · 기울기 ${record.tilt === null ? '미입력' : record.tilt+'°'} · 후퇴량 ${record.setback === null ? '미입력' : record.setback+'mm'}`);
      const previous = records.slice(i+1).find(r => r.name === record.name);
      addText(article,compareFit(record,previous));
      addText(article,`키 ${record.bodyHeight ?? '미입력'}cm · 인심 ${record.inseam ?? '미입력'}cm · ${record.purpose}`);
      if (record.checks.length) addText(article,`점검 항목: ${record.checks.map(key => ({hips:'골반 흔들림',reach:'상체 긴장',slide:'미끄러짐',pain:'통증·저림'})[key]).join(', ')}`);
      if (record.notes) addText(article,record.notes);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'secondary no-print'; remove.textContent = '이 기록 삭제';
      remove.addEventListener('click', () => {
        if (window.confirm('이 기록을 삭제할까요?')) { if (persist(records.filter(r => r.id !== record.id))) { status.textContent = '기록을 삭제했습니다.'; renderRecords(); } }
      }); article.append(remove); container.append(article);
    });
  }
  el('journal-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!el('journal-form').reportValidity()) return;
    if (records.length >= 200) { status.textContent = '최대 200개까지 저장할 수 있습니다. 내보내기로 백업한 뒤 이전 기록을 삭제하세요.'; return; }
    // Optional profile values must also be valid before being attached to a record.
    for (const id of ['fit-height','fit-inseam']) if (el(id).value && !el(id).reportValidity()) return;
    const record = { id: crypto.randomUUID(), date: new Date().toISOString(), height: Number(el('record-height').value),
      tilt: optional('record-tilt'), setback: optional('record-setback'), name: el('record-name').value.trim(), notes: el('record-notes').value.trim(),
      inseam: optional('fit-inseam'), bodyHeight: optional('fit-height'), purpose: el('fit-purpose').value, checks: checked() };
    if (persist([record,...records])) { status.textContent = '현재 브라우저에 기록을 저장했습니다.'; renderRecords(); }
  });
  el('export-records').addEventListener('click', () => {
    if (!records.length && storedRaw === null) { status.textContent = '내보낼 기록이 없습니다.'; return; }
    const blob = new Blob([storedRaw || JSON.stringify(records,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'cycling-fit-records.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
  });
  el('print-fit').addEventListener('click', () => window.print());
  load(); renderRecords();
}
