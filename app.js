const cities = [
  ['서울특별시', 37.5665, 126.978], ['부산광역시', 35.1796, 129.0756], ['대구광역시', 35.8714, 128.6014],
  ['인천광역시', 37.4563, 126.7052], ['광주광역시', 35.1595, 126.8526], ['대전광역시', 36.3504, 127.3845],
  ['울산광역시', 35.5384, 129.3114], ['세종특별자치시', 36.4801, 127.289], ['제주특별자치도', 33.4996, 126.5312]
];
const $ = (s) => document.querySelector(s);
const select = $('#citySelect');
cities.forEach(([name, lat, lon]) => select.add(new Option(name, `${lat},${lon}`)));

const weatherCodes = { 0:['☀','맑은 하늘'], 1:['🌤','대체로 맑음'], 2:['⛅','구름 조금'], 3:['☁','흐림'], 45:['🌫','안개'], 48:['🌫','안개'], 51:['🌦','이슬비'], 53:['🌦','이슬비'], 55:['🌧','이슬비'], 61:['🌧','비'], 63:['🌧','비'], 65:['🌧','강한 비'], 71:['🌨','눈'], 73:['🌨','눈'], 75:['❄','강한 눈'], 80:['🌦','소나기'], 81:['🌧','소나기'], 82:['⛈','강한 소나기'], 95:['⛈','뇌우'] };
const describe = (code) => weatherCodes[code] || ['🌤','날씨 정보'];
const formatTime = (iso) => new Intl.DateTimeFormat('ko-KR',{hour:'numeric',hour12:false}).format(new Date(iso));

async function loadWeather(lat, lon, name) {
  $('#updatedAt').textContent = '불러오는 중';
  try {
    const params = new URLSearchParams({ lat, lon });
    const response = await fetch(`/api/weather?${params}`);
    if (!response.ok) throw new Error('날씨 데이터를 불러오지 못했습니다.');
    const data = await response.json(); const current = data.current; const [icon, phrase] = describe(current.weather_code);
    $('#locationName').textContent = name; $('#weatherIcon').textContent = icon; $('#weatherPhrase').textContent = phrase;
    $('#temperature').textContent = Math.round(current.temperature_2m); $('#feelsLike').textContent = `${Math.round(current.apparent_temperature)}°`;
    $('#humidity').textContent = `${current.relative_humidity_2m}%`; $('#windSpeed').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    const currentIndex = data.hourly.time.findIndex((time) => time >= current.time); const probability = data.hourly.precipitation_probability[currentIndex] ?? 0;
    $('#rainChance').textContent = `${probability}%`; $('#updatedAt').textContent = `${new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())} 업데이트`;
    renderForecast(data.hourly, Math.max(0,currentIndex));
  } catch (error) { $('#updatedAt').textContent = '연결을 확인해 주세요'; $('#weatherPhrase').textContent = error.message; }
}
function renderForecast(hourly, start) {
  // 현재 시각부터 이후 12개 시간대(총 12시간)를 표시합니다.
  const availableHours = Math.min(12, hourly.time.length - start);
  const items = Array.from({length:availableHours},(_, i) => start + i).map((index,i) => { const [icon] = describe(hourly.weather_code[index]); return `<article class="forecast-item ${i === 0 ? 'active':''}"><span class="forecast-time">${i === 0 ? 'NOW' : formatTime(hourly.time[index])}</span><span class="forecast-icon">${icon}</span><strong class="forecast-temp">${Math.round(hourly.temperature_2m[index])}°</strong><p class="forecast-rain">비 ${hourly.precipitation_probability[index] ?? 0}%</p></article>`; }).join('');
  $('#forecastList').innerHTML = items;
}
function currentSelection() { const [lat,lon] = select.value.split(',').map(Number); return [lat,lon,select.options[select.selectedIndex].text]; }
select.addEventListener('change', () => loadWeather(...currentSelection()));
$('#refreshButton').addEventListener('click', () => loadWeather(...currentSelection()));
$('#locateButton').addEventListener('click', () => {
  if (!navigator.geolocation) return alert('이 브라우저에서는 위치 정보를 지원하지 않습니다.');
  navigator.geolocation.getCurrentPosition(({coords}) => loadWeather(coords.latitude, coords.longitude, '현재 위치'), () => alert('위치 접근 권한을 허용해 주세요.'));
});
$('#todayDate').textContent = new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(new Date());
loadWeather(...currentSelection());
