/**
 * 知了 · 示例插件:安全计算器
 * 只暴露 Math 到表达式作用域,适合快速算数。
 * 信任说明:与 bash 同级(agent 本来就能跑任意命令),不做安全边界。
 */
export default {
  name: 'calc',
  description: '数学计算器工具',
  apply(ctx) {
    ctx.tools.register({
      name: 'calc',
      description: '计算数学表达式(支持 + - * / 括号、** 幂、Math 函数如 sqrt(16) 或 log(100))',
      parameters: {
        type: 'object',
        properties: { expr: { type: 'string', description: '数学表达式,如 (2+3)*4 或 sqrt(2)' } },
        required: ['expr'],
        additionalProperties: false,
      },
      async execute(args) {
        const expr = String(args.expr ?? '').trim();
        if (!expr) return '表达式为空';
        try {
          // 注入常用 Math 方法,让 sqrt/log/pow 等直接可用
          const fn = new Function('Math', `"use strict"; const {sqrt,log,log2,log10,pow,abs,round,floor,ceil,trunc,sign,sin,cos,tan,asin,acos,atan,min,max,PI,E}=Math; return (${expr});`);
          const result = fn(Math);
          return `${expr} = ${result}`;
        } catch (err) {
          return `表达式错误: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    });
  },
};
