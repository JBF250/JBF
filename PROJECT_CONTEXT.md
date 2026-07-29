# 个人网站技术上下文

> 本文件为开发对话提供快速上下文，详细需求见 `.trae/specs/v2-full-rewrite/spec.md`

## 1. 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| 后端服务 | Supabase (Auth + PostgreSQL + Storage) |
| 动画 | GSAP + ScrollTrigger + Lenis |
| 3D渲染 | Three.js + @react-three/fiber |
| 路由 | React Router DOM |
| 图标 | Lucide React |
| 部署 | Cloudflare Pages |

## 2. 项目结构

```
src/
├── components/        # 公共组件
│   ├── Layout.tsx    # 全局布局（导航栏+页脚）
│   ├── Navigation.tsx
│   └── ...
├── context/           # React Context
│   ├── AuthContext.tsx   # 用户认证
│   ├── I18nContext.tsx   # 国际化
│   └── ThemeContext.tsx  # 主题切换
├── data/              # 静态数据
│   ├── gainian-posts/  # 概念1博客JSON文件
│   │   ├── post-game-dev.json
│   │   ├── post-winui3.json
│   │   └── post-website-tech.json
│   ├── works.json      # 作品展示数据
│   └── zh.json/en.json/ja.json  # 语言文件
├── lib/               # 工具库
│   ├── supabase.ts   # Supabase客户端
│   └── gainianPosts.ts  # 概念1博客加载
├── pages/             # 页面组件
│   ├── Home.tsx          # 首页（3D动画+入场动画）
│   ├── Blog.tsx          # 博客列表
│   ├── BlogDetail.tsx    # 博客详情
│   ├── Login.tsx         # 登录
│   ├── Register.tsx      # 注册
│   ├── Settings.tsx      # 账户设置
│   ├── GameDetail.tsx    # 游戏详情
│   ├── SoftwareDetail.tsx# 软件详情
│   └── Contact.tsx       # 联系我
├── App.tsx
└── main.tsx
```

## 3. 数据库表结构

### community_posts（社区帖子）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 作者用户ID |
| title | text | 标题 |
| content | text | 内容 |
| images | text[] | 图片URL数组 |
| author_display_name | text | 作者显示名 |
| author_avatar_url | text | 作者头像 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### community_likes（点赞记录）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| post_id | text | 帖子ID（支持UUID或字符串） |
| post_type | text | 帖子类型：community/gainian |
| user_id | UUID | 点赞用户ID |
| created_at | timestamptz | 创建时间 |

唯一约束：UNIQUE(post_type, post_id, user_id)

### community_comments（评论记录）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| post_id | text | 帖子ID |
| post_type | text | 帖子类型：community/gainian |
| user_id | UUID | 评论用户ID |
| content | text | 评论内容 |
| display_name | text | 用户显示名 |
| avatar_url | text | 用户头像 |
| created_at | timestamptz | 创建时间 |

### users（用户资料）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键（关联auth.users） |
| display_name | text | 显示名 |
| avatar_url | text | 头像URL |
| theme_color | text | 主题色 |
| language | text | 语言：zh/en/ja |
| username | text | 用户名 |

## 4. 核心功能清单

✅ **用户系统**
- 注册/登录/登出
- 邮箱验证
- 用户资料管理（头像、显示名、主题色、语言）

✅ **博客系统**
- 社区帖子：发布/编辑/删除/点赞/评论
- 概念1博客：从JSON文件自动加载，支持点赞/评论
- 图片上传（社区帖子用Supabase Storage，概念1用本地图片）
- 多语言内容支持

✅ **作品展示**
- 游戏作品（《离去之后》《嘲哳》）
- 软件作品（Lume）
- 详情页支持多语言

✅ **视觉效果**
- Three.js 3D入场动画（星球爆炸→星空生成）
- GSAP滚动动画
- Lenis丝滑滚动
- 深色/浅色主题切换

✅ **多语言**
- 中文/英文/日文切换
- 所有UI文本使用i18n key

## 5. 开发规范摘要

### 多语言规范
- 所有UI文本**必须**使用i18n key，禁止硬编码
- 新页面**必须**支持中英日三语
- 修改文本后**必须**同步更新zh.json/en.json/ja.json

### 数据存储规范
- 多设备同步数据**必须**存储在Supabase
- 点赞/评论/收藏**必须**用Supabase
- localStorage仅用于临时状态

### 概念1博客格式
```json
{
  "id": "gainian-1",
  "title": { "zh": "...", "en": "...", "ja": "..." },
  "content": { "zh": "...", "en": "...", "ja": "..." },
  "date": "2026-07-25"
}
```
- 放入 `src/data/gainian-posts/` 目录自动加载
- 图片使用 `[图片调用指令：filename.png]` 语法

## 6. 关键配置

- Supabase URL和Key在 `.env` 文件中配置
- 环境变量：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`
- Supabase项目：`noiebpjyskscjtmdytxj`
- 部署：Cloudflare Pages 自动构建 `main` 分支