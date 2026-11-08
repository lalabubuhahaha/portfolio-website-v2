import type { ContentItem } from "./types";

const markdownContent = (title: string, image: string, imageAlt: string) => `
## 專案背景

這是「${title}」的佔位案例內容，用來驗證未來 Case Study 的資訊結構；目前不代表正式專案成果或研究數據。

### 本階段關注事項

- 釐清使用情境與內容層級
- 保持介面資訊清楚可讀
- 記錄後續需要驗證的假設

> 此處是設計思考引言的佔位文字，正式內容將在案例資料確認後補上。

可參考 [作品列表](/work) 返回所有專案。

![${imageAlt}](${image})

## 設計過程

這個段落預留給流程、設計取捨與迭代紀錄。

### 下一步

後續會補上經過確認的內容與圖片，不會使用虛構成果。
`;

export const mockContentItems: readonly ContentItem[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Independent Product Alpha",
    slug: "independent-product-alpha",
    type: "independent",
    category: ["Product Design", "AI-assisted Development"],
    cover: "/placeholders/project-alpha.svg",
    cover_alt: "Independent Product Alpha 專案封面佔位圖",
    summary: "獨立產品案例的佔位摘要，預留給產品規劃、設計與開發協作內容。",
    role: "Product Designer",
    year: 2026,
    tools: ["Figma", "AI Development Tools"],
    featured: true,
    sort_order: 10,
    status: "published",
    content: markdownContent("Independent Product Alpha", "/placeholders/project-alpha.svg", "Independent Product Alpha 內容圖片佔位圖"),
    created_at: "2026-01-10T08:00:00.000Z",
    updated_at: "2026-02-15T08:00:00.000Z",
    published_at: "2026-02-20T08:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    title: "Independent Product Beta",
    slug: "independent-product-beta",
    type: "independent",
    category: ["UX Strategy", "Prototyping"],
    cover: "/placeholders/project-beta.svg",
    cover_alt: "Independent Product Beta 專案封面佔位圖",
    summary: "第二個獨立產品案例的佔位摘要，內容尚待正式整理。",
    role: "UI/UX Designer",
    year: 2025,
    tools: ["Figma", "Next.js"],
    featured: false,
    sort_order: 40,
    status: "published",
    content: markdownContent("Independent Product Beta", "/placeholders/project-beta.svg", "Independent Product Beta 內容圖片佔位圖"),
    created_at: "2025-08-01T08:00:00.000Z",
    updated_at: "2026-01-12T08:00:00.000Z",
    published_at: "2026-01-15T08:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    title: "Professional Project Gamma",
    slug: "professional-project-gamma",
    type: "client",
    category: ["Interface Design", "Design System"],
    cover: "/placeholders/project-gamma.svg",
    cover_alt: "Professional Project Gamma 專案封面佔位圖",
    summary: "商業專案案例的佔位摘要，不包含真實客戶名稱或未確認成果。",
    role: "Senior UI Designer",
    year: 2024,
    tools: ["Figma", "FigJam"],
    featured: true,
    sort_order: 20,
    status: "published",
    content: markdownContent("Professional Project Gamma", "/placeholders/project-gamma.svg", "Professional Project Gamma 內容圖片佔位圖"),
    created_at: "2024-03-18T08:00:00.000Z",
    updated_at: "2025-12-01T08:00:00.000Z",
    published_at: "2025-12-05T08:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    title: "Client Experience Delta",
    slug: "client-experience-delta",
    type: "client",
    category: ["UX Design", "Responsive Design"],
    cover: "/placeholders/project-delta.svg",
    cover_alt: "Client Experience Delta 專案封面佔位圖",
    summary: "客戶委託案例的佔位摘要，正式資訊將在取得可公開內容後補充。",
    year: 2023,
    tools: ["Figma"],
    featured: false,
    sort_order: 60,
    status: "published",
    content: markdownContent("Client Experience Delta", "/placeholders/project-delta.svg", "Client Experience Delta 內容圖片佔位圖"),
    created_at: "2023-06-10T08:00:00.000Z",
    updated_at: "2025-11-20T08:00:00.000Z",
    published_at: "2025-11-22T08:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    title: "Interface Exploration Epsilon",
    slug: "interface-exploration-epsilon",
    type: "independent",
    category: ["UI Exploration", "Interaction Design"],
    cover: "/placeholders/project-epsilon.svg",
    cover_alt: "Interface Exploration Epsilon 專案封面佔位圖",
    summary: "介面探索作品的佔位摘要，用於展示其他類型的設計內容。",
    role: "UI Designer",
    year: 2025,
    tools: ["Figma"],
    featured: true,
    sort_order: 30,
    status: "published",
    content: markdownContent("Interface Exploration Epsilon", "/placeholders/project-epsilon.svg", "Interface Exploration Epsilon 內容圖片佔位圖"),
    created_at: "2025-02-04T08:00:00.000Z",
    updated_at: "2025-10-03T08:00:00.000Z",
    published_at: "2025-10-05T08:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000006",
    title: "Design Study Zeta",
    slug: "design-study-zeta",
    type: "client",
    category: ["Design Study", "Information Architecture"],
    cover: "/placeholders/project-zeta.svg",
    cover_alt: "Design Study Zeta 專案封面佔位圖",
    summary: "設計研究整理的佔位摘要，目前沒有放入正式研究數據。",
    role: "Product Designer",
    year: 2022,
    tools: ["FigJam", "Figma"],
    featured: false,
    sort_order: 50,
    status: "published",
    content: markdownContent("Design Study Zeta", "/placeholders/project-zeta.svg", "Design Study Zeta 內容圖片佔位圖"),
    created_at: "2022-09-14T08:00:00.000Z",
    updated_at: "2025-09-01T08:00:00.000Z",
    published_at: "2025-09-03T08:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000007",
    title: "Draft Concept Eta",
    slug: "draft-concept-eta",
    type: "independent",
    category: ["Concept", "Work in Progress"],
    cover: "/placeholders/project-eta.svg",
    cover_alt: "Draft Concept Eta 專案封面佔位圖",
    summary: "尚未發布的概念草稿，不應出現在任何公開查詢結果。",
    year: 2026,
    tools: ["Figma"],
    featured: true,
    sort_order: 5,
    status: "draft",
    content: markdownContent("Draft Concept Eta", "/placeholders/project-eta.svg", "Draft Concept Eta 內容圖片佔位圖"),
    created_at: "2026-03-01T08:00:00.000Z",
    updated_at: "2026-03-02T08:00:00.000Z",
  },
];
