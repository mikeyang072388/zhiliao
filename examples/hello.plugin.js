/**
 * 知了 · 示例插件
 *
 * 放到 ~/.zhiliao/plugins/ 下即可被自动加载(启动时 + 网页"重载"按钮)。
 * 一个插件 = 一个对象:{ name, description?, apply(ctx) }
 * apply 里用 ctx.tools.register(...) 注册工具(与内置工具同一协议)。
 */
export default {
  name: 'hello',
  description: '示例插件:添加一个 say_hello 工具',
  apply(ctx) {
    ctx.tools.register({
      name: 'say_hello',
      description: '向指定的人问好',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string', description: '谁的名字' } },
        required: ['name'],
        additionalProperties: false,
      },
      async execute(args) {
        return `你好, ${args.name ?? '朋友'}!这是知了插件系统的第一个工具 🎉`;
      },
    });
  },
};
