# Prototype Preview

这个文件夹包含了用于预览 `prototype.tsx` 的独立开发环境。

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器会自动打开 `http://localhost:3000` 显示原型预览。

## 文件说明

- `prototype.tsx` - 原型组件（从上级目录复制）
- `main.tsx` - React 应用入口
- `index.html` - HTML 入口
- `index.css` - 样式入口（TailwindCSS）
- `vite.config.ts` - Vite 配置
- `tailwind.config.js` - TailwindCSS 配置
- `postcss.config.js` - PostCSS 配置
- `tsconfig.json` - TypeScript 配置

## 注意

如果你修改了上级目录的 `prototype.tsx`，记得重新复制到这里以查看最新效果。
