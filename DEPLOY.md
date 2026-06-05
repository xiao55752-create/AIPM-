# 部署指南 · GitHub

## 方案 A：Vercel（推荐）

- 免费 HTTPS、全球 CDN、自动预览 PR  
- 支持 Nuxt SSR，无需改 `baseURL`  

步骤：GitHub 仓库 → Vercel Import → Deploy

环境变量（可选）：

- `NUXT_PUBLIC_CONTACT_EMAIL` — 成长营联系邮箱

## 方案 B：GitHub Pages（静态）

1. 取消 `nuxt.config.ts` 里 `ssr: false` 注释（若已加）并设置：

```ts
app: {
  baseURL: '/你的仓库名/',
}
```

2. 推送后 Actions 自动 `pnpm generate` 并部署  

3. 访问：`https://你的用户名.github.io/你的仓库名/`

## 方案 C：腾讯云 / 阿里云

```bash
pnpm generate
# 将 .output/public 上传到对象存储 + CDN
```

## 自定义域名

- Vercel：Project Settings → Domains  
- 国内域名需备案后解析  

## 隐私说明

自测与简历粘贴默认仅存在用户浏览器 localStorage，不上传服务器（当前 MVP 无后端）。
