/**
 * 知了 · 示例插件:时间
 * 用法:cp 到 ~/.zhiliao/plugins/time.js,启动/重载后可用 now 工具
 */
export default {
  name: 'time',
  description: '当前日期与时间工具',
  apply(ctx) {
    ctx.tools.register({
      name: 'now',
      description: '返回当前的日期和时间(北京时间,精确到秒)',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      async execute() {
        const d = new Date();
        return `现在: ${d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}`;
      },
    });
  },
};
