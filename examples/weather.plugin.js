/**
 * 知了 · 示例插件:天气
 * 用 open-meteo 免费 API(无需 key),内置几个城市的坐标。
 */
const CITIES = {
  北京: [39.9, 116.4],
  上海: [31.2, 121.5],
  广州: [23.1, 113.3],
  深圳: [22.5, 114.1],
  杭州: [30.3, 120.2],
  成都: [30.6, 104.1],
  武汉: [30.6, 114.3],
  西安: [34.3, 108.9],
};

function codeText(code) {
  if (code === 0) return '晴 ☀️';
  if (code <= 2) return '多云 ⛅';
  if (code <= 48) return '阴/雾 🌫️';
  if (code <= 67) return '雨 🌧️';
  if (code <= 77) return '雪 ❄️';
  if (code <= 82) return '阵雨 🌦️';
  if (code <= 86) return '雪阵 🌨️';
  return '雷雨 ⛈️';
}

export default {
  name: 'weather',
  description: '天气查询(open-meteo 免费 API,无需 key)',
  apply(ctx) {
    ctx.tools.register({
      name: 'weather',
      description: `查询某城市的当前天气。支持城市: ${Object.keys(CITIES).join('、')}`,
      parameters: {
        type: 'object',
        properties: { city: { type: 'string', description: '城市名,如 北京' } },
        required: ['city'],
        additionalProperties: false,
      },
      async execute(args) {
        const city = String(args.city ?? '').trim();
        const coord = CITIES[city];
        if (!coord) return `暂不支持 ${city},可用城市: ${Object.keys(CITIES).join('、')}`;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord[0]}&longitude=${coord[1]}&current_weather=true&timezone=Asia%2FShanghai`;
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
          const data = await res.json();
          const w = data.current_weather;
          return `${city} 当前天气: ${codeText(w.weathercode)},${w.temperature}°C,风 ${w.windspeed} km/h`;
        } catch (err) {
          return `查询失败: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    });
  },
};
