﻿<script setup>
import { ref, computed, reactive } from "vue";
import { onLoad, onPageScroll } from "@dcloudio/uni-app";
import { generateReport } from "@/api/module/pay.js";

const tr = (s) => s;
const getStaticPath = (p) => `/${p}`;

const loading = ref(true);
const isDownloading = ref(false);
const reportData = ref({});
const errorMsg = ref("");
const genData = ref({});

// 存储从 API 解析出的渲染数据
const displayReport = ref(null);
const targetYear = ref(2026);

// 辅助：安全获取嵌套属性
const getDR = (path, fallback = "") => {
  const dr = displayReport.value;
  if (!dr) return fallback;
  const keys = path.split(".");
  let val = dr;
  for (const k of keys) {
    if (val == null) return fallback;
    val = val[k];
  }
  return val ?? fallback;
};

// 接 onLoad 进来的表单参数
const queryForm = reactive({
  name: "",
  solar_date: "",
  birth_time: "",
  gender: "",
  birth_place: ""
});

onLoad(async (options) => {
  if (options) {
    if (options.name) queryForm.name = decodeURIComponent(options.name);
    if (options.solar_date) queryForm.solar_date = decodeURIComponent(options.solar_date);
    if (options.birth_time) queryForm.birth_time = decodeURIComponent(options.birth_time);
    if (options.gender) queryForm.gender = decodeURIComponent(options.gender);
    if (options.birth_place) queryForm.birth_place = decodeURIComponent(options.birth_place);
  }

  // 获取订单号：优先从 URL 参数读取（支付宝回跳），其次 localStorage（同窗口支付）
  let orderNo = options?.out_trade_no || options?.orderNo || "";
  if (!orderNo) {
    try {
      orderNo = localStorage.getItem("report_order_no") || "";
    } catch (_) { /* ignore */ }
  }

  if (!orderNo) {
    errorMsg.value = "未获取到订单信息，请重新支付";
    loading.value = false;
    return;
  }

  try {
    const res = await generateReport({
      orderNo,
      solarDate: queryForm.solar_date || undefined,
      birthTime: queryForm.birth_time || undefined,
      gender: queryForm.gender || undefined,
      city: queryForm.birth_place || undefined
    });

    if (res?.code !== 200) {
      throw new Error(res?.msg || "生成报告失败");
    }

    const data = res.data;
    if (!data) {
      throw new Error("报告数据为空");
    }

    // genData 是 JSON 字符串，需要解析
    let tempGenData = {};
    if (data.genData) {
      try {
        tempGenData = typeof data.genData === "string" ? JSON.parse(data.genData) : data.genData;
        // 打印 genData 顶层所有字段
        console.log("[genData top-level keys]", Object.keys(tempGenData));
        // 打印 complete_data 字段
        if (tempGenData.complete_data) {
          console.log("[genData complete_data keys]", Object.keys(tempGenData.complete_data));
          // 打印 display_report 字段
          if (tempGenData.complete_data.display_report) {
            const dr = tempGenData.complete_data.display_report;
            console.log("[display_report keys]", Object.keys(dr));
            // 打印每个子模块的字段
            Object.keys(dr).forEach(key => {
              const val = dr[key];
              if (val && typeof val === 'object' && !Array.isArray(val)) {
                console.log(`[${key} keys]`, Object.keys(val));
              } else if (Array.isArray(val)) {
                console.log(`[${key}] array length:`, val.length);
                if (val.length > 0 && typeof val[0] === 'object') {
                  console.log(`[${key}[0] keys]`, Object.keys(val[0]));
                }
              } else {
                console.log(`[${key}]`, typeof val, val);
              }
            });
          }
        }
      } catch (_) {
        tempGenData = { raw: data.genData };
      }
    }
    genData.value = tempGenData;

    // 提取 display_report 完整数据
    const dr = tempGenData.complete_data?.display_report || {};
    displayReport.value = dr;

    // 设置目标年份
    if (dr.report_meta?.target_year) {
      targetYear.value = dr.report_meta.target_year;
    }

    // 组装基础报告展示数据
    reportData.value = {
      name: dr.birth_info?.solar_date ? queryForm.name || "—" : queryForm.name || "—",
      birth: dr.birth_info?.solar_date || queryForm.solar_date || "—",
      trueSolarDate: dr.birth_info?.true_solar_date || "",
      birthTime: dr.birth_info?.birth_time || queryForm.birth_time || "—",
      trueBirthTime: dr.birth_info?.true_birth_time || "",
      place: dr.birth_info?.city || queryForm.birth_place || "—",
      gender: dr.birth_info?.gender || queryForm.gender || "—",
      orderNo: data.orderNo,
      schemaVersion: tempGenData.complete_data?.schema_version || "",
      reportType: tempGenData.complete_data?.report_type || "",
      targetDate: dr.report_meta?.target_date || "",
      currentMonth: dr.report_meta?.current_month || "",
      targetYear: dr.report_meta?.target_year || "",
      generatedAt: dr.report_meta?.generated_at || "",
      disclaimer: dr.report_meta?.disclaimer || ""
    };
  } catch (e) {
    console.error("[result] generateReport error", e);
    errorMsg.value = e?.message || "加载报告失败";
  } finally {
    loading.value = false;
  }
});

// 顶部信息卡
const topCardItems = computed(() => [
  { label: "姓名", value: reportData.value.name || "—" },
  { label: "出生", value: reportData.value.birth || "—" },
  { label: "时间", value: reportData.value.birthTime || "—" },
  { label: "地点", value: reportData.value.place || "—" },
  { label: "性别", value: reportData.value.gender || "—" }
]);

// 快速导航（模板中 v-if="false" 隐藏，但仍需定义以防 lint 警告）
const navSections = [
  { id: "fast-read", label: "快速阅读" },
  { id: "decade-card", label: "十年行旅" },
  { id: "annual-card", label: "年度主题" },
  { id: "monthly-card", label: "每月旋律" },
  { id: "guide-card", label: "节奏指引" }
];

const fastReadItems = computed(() => [
  { icon: getStaticPath("images/life-report/date-icon.png"), label: "年度", value: String(getDR("report_meta.target_year", new Date().getFullYear())) },
  { icon: getStaticPath("images/life-report/book-icon.png"), label: "当前月份", value: String(getDR("report_meta.current_month", new Date().getMonth() + 1)) + tr("月") },
  { icon: getStaticPath("images/life-report/ring-icon.png"), label: "月度提醒", value: "12" + tr("个月") },
  { icon: getStaticPath("images/life-report/position-icon.png"), label: "生活十问", value: "10" + tr("个问题") },
  { icon: getStaticPath("images/life-report/date-icon.png"), label: "空间建议", value: "5" + tr("个角落") },
  { icon: getStaticPath("images/life-report/book-icon.png"), label: "生活十问", value: (tenQuestionsSamples.value[0]?.display_question || tenQuestionsSamples.value[0]?.question || "").slice(0, 12) + "..." }
]);

// 当前月份标题（用于快速阅读）
const currentMonthTitle = computed(() => {
  const monthData = getDR("monthly_rhythms", []);
  const now = new Date().getMonth(); // 0-based
  if (Array.isArray(monthData) && monthData[now]) {
    return monthData[now].title || `第${now + 1}月`;
  }
  return `第${now + 1}月`;
});

// 十年行旅 - 全部从 API 数据动态读取
const decadePeriod = computed(() => getDR("ten_year_journey.period", "25-34岁"));
const decadeMainRhythm = computed(() => getDR("ten_year_journey.main_rhythm", "成长期：构建基础与方向"));
const decadeSummary = computed(() => getDR("ten_year_journey.summary", "这一阶段是打基础的时段。"));
const decadeTags = computed(() => {
  const tags = getDR("ten_year_journey.tags", []);
  return Array.isArray(tags) ? tags : ["立业", "筑基"];
});
const decadeSihuaSummary = computed(() => getDR("ten_year_journey.sihua_theme.summary", "围绕事业、关系、学习三条主线推进。"));
const decadeThemes = computed(() => {
  const list = getDR("ten_year_journey.sihua_theme.transformations", []);
  if (!Array.isArray(list) || list.length === 0) {
    return [
      { type: "滋养主题", star: "边界感", palace: "职业发展", display_name: "职场归位 稳步积能", detail: "守住自身节奏边界。" },
      { type: "推动主题", star: "更新力", palace: "内在满足", display_name: "向内校准心境", detail: "每周梳理心绪。" }
    ];
  }
  return list.map(t => ({
    type: t.type || "",
    star: t.star || "",
    palace: t.palace || "",
    display_name: t.display_name || "",
    detail: t.detail || "",
    tag: t.display_name || t.type || "主题",
    title: t.display_name || "主题",
    desc: t.detail || "",
    bg: t.type === "滋养主题" ? "#eef6ff" : t.type === "推动主题" ? "#fff7e6" : t.type === "修复主题" ? "#f0f9eb" : "#fdf2f0"
  }));
});

// 十二个生活主题 - 从 palaceSummaries 动态生成
const lifeThemeIcons = [
  "images/life-report/date-icon.png",
  "images/life-report/book-icon.png",
  "images/life-report/ring-icon.png",
  "images/life-report/position-icon.png"
];
const allLifeThemes = computed(() => {
  const palaces = palaceSummaries.value;
  if (palaces.length === 0) {
    // 兜底静态数据
    return [
      { icon: getStaticPath("images/life-report/date-icon.png"), title: "事业节奏", desc: "把握关键节点" },
      { icon: getStaticPath("images/life-report/book-icon.png"), title: "关系维护", desc: "定期联系核心亲友" },
      { icon: getStaticPath("images/life-report/ring-icon.png"), title: "健康管理", desc: "睡眠 + 运动双线推进" },
      { icon: getStaticPath("images/life-report/position-icon.png"), title: "财务规划", desc: "建立应急与长期账户" },
      { icon: getStaticPath("images/life-report/date-icon.png"), title: "学习成长", desc: "每周阅读 + 复盘" },
      { icon: getStaticPath("images/life-report/book-icon.png"), title: "兴趣探索", desc: "留出探索时间" },
      { icon: getStaticPath("images/life-report/ring-icon.png"), title: "家庭生活", desc: "仪式感与陪伴" },
      { icon: getStaticPath("images/life-report/position-icon.png"), title: "社交拓展", desc: "高质量弱关系" },
      { icon: getStaticPath("images/life-report/date-icon.png"), title: "心态调适", desc: "正念与情绪记录" },
      { icon: getStaticPath("images/life-report/book-icon.png"), title: "空间整理", desc: "定期断舍离" },
      { icon: getStaticPath("images/life-report/ring-icon.png"), title: "时间管理", desc: "重要不紧急优先" },
      { icon: getStaticPath("images/life-report/position-icon.png"), title: "目标管理", desc: "季度复盘" }
    ];
  }
  return palaces.map((p, i) => ({
    icon: getStaticPath(lifeThemeIcons[i % lifeThemeIcons.length]),
    title: p.palace || p.module || `宫位${i + 1}`,
    desc: p.summary || ""
  }));
});
const lifeThemesExpanded = ref(false);
const displayedLifeThemes = computed(() =>
  lifeThemesExpanded.value ? allLifeThemes.value : allLifeThemes.value.slice(0, 4)
);
const toggleLifeThemes = () => {
  lifeThemesExpanded.value = !lifeThemesExpanded.value;
};

// 年度核心主题 - 全部从 API 数据动态读取
const annualRhythmTitle = computed(() => getDR("annual_rhythm.title", "今年年度节奏主旋律"));
const annualRhythmDesc = computed(() => getDR("annual_rhythm.summary", "今年整体节奏偏稳健。"));
const annualCoreDesc = computed(() => getDR("annual_rhythm.sihua_theme.summary", "围绕'建立秩序'展开。"));
const annualThemeCards = computed(() => {
  const list = getDR("annual_rhythm.sihua_theme.transformations", []);
  if (!Array.isArray(list) || list.length === 0) {
    return [
      { tag: "事业", title: "建立秩序", desc: "把核心项目从 0 推到 1", bg: "#fff7e6" },
      { tag: "关系", title: "深度连接", desc: "与 3 位重要的人深度沟通", bg: "#fdf2f0" },
      { tag: "自我", title: "稳态作息", desc: "睡眠 7+ 小时/天", bg: "#eef6ff" }
    ];
  }
  return list.map(t => ({
    type: t.type || "",
    star: t.star || "",
    palace: t.palace || "",
    display_name: t.display_name || "",
    detail: t.detail || "",
    tag: t.display_name || t.type || "主题",
    title: t.display_name || "主题",
    desc: t.detail || "",
    bg: t.type === "滋养主题" ? "#eef6ff" : t.type === "推动主题" ? "#fff7e6" : t.type === "修复主题" ? "#f0f9eb" : "#fdf2f0"
  }));
});

// 每月旋律 - 从 API 数据动态读取
const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const selectedMonth = ref(new Date().getMonth() + 1);
const selectMonth = (m) => {
  selectedMonth.value = m;
};

// 从 API 获取所有月份数据（按 month 字段索引）
const monthlyDataMap = computed(() => {
  const list = getDR("monthly_rhythms", []);
  const map = {};
  if (Array.isArray(list)) {
    list.forEach(item => {
      if (item.month) map[item.month] = item;
    });
  }
  return map;
});

const monthContents = computed(() => {
  const m = selectedMonth.value;
  const data = monthlyDataMap.value[m];
  if (data) {
    // 截断 summary 末尾的省略号或多余文字
    let desc = data.summary || "";
    return {
      title: data.title || `${m}月`,
      desc: desc
    };
  }
  return {
    title: `${m}月`,
    desc: "暂无数据"
  };
});

// ====== 以下为从 API 后端数据动态读取的补充字段 ======

// ten_year_journey 补充字段
const tenYearJourneyTitle = computed(() => getDR("ten_year_journey.display_title", "十年行旅"));
const decadeSourceTimeLevel = computed(() => getDR("ten_year_journey.source_time_level", ""));

// palace_summaries - 十二宫运势完整列表
const palaceSummaries = computed(() => {
  const list = getDR("ten_year_journey.palace_summaries", []);
  return Array.isArray(list) ? list : [];
});

// annual_rhythm 补充字段
const annualSource = computed(() => getDR("annual_rhythm.source", ""));
const annualStemBranch = computed(() => getDR("annual_rhythm.sihua_theme.annual_stem_branch", ""));

// future_guidance 未来指引
const futureGuidanceTitle = computed(() => getDR("future_guidance.title", "日常行旅指引"));
const futureGuidanceSummary = computed(() => getDR("future_guidance.summary", "暂无未来指引数据"));

// ten_questions - 生活十问
const tenQuestionsSourceEndpoint = computed(() => getDR("ten_questions.source_endpoint", ""));
const tenQuestionsTimeLevels = computed(() => {
  const list = getDR("ten_questions.supported_time_levels", []);
  if (!Array.isArray(list) || list.length === 0) {
    return [
      { value: "yearly", label: "今年", usage: "看当年问题的建议。", bg: "#fff7e6" },
      { value: "monthly", label: "本月", usage: "看当月行动提醒。", bg: "#eef6ff" }
    ];
  }
  return list.map((t, i) => ({
    ...t,
    bg: i % 2 === 0 ? "#fff7e6" : "#eef6ff"
  }));
});
const tenQuestionsFields = computed(() => {
  const list = getDR("ten_questions.available_fields", []);
  if (!Array.isArray(list) || list.length === 0) {
    return [
      { icon: getStaticPath("images/life-report/date-icon.png"), label: "行动方向", desc: "适合沟通、整理或行动的空间参考。" },
      { icon: getStaticPath("images/life-report/book-icon.png"), label: "协作线索", desc: "可作为人际协作的趣味提示。" }
    ];
  }
  return list.map(f => ({
    icon: getStaticPath("images/life-report/date-icon.png"),
    label: f.field || "",
    sub: "",
    desc: f.desc || ""
  }));
});
const tenQuestionsSamples = computed(() => {
  const list = getDR("ten_questions.samples", []);
  if (!Array.isArray(list) || list.length === 0) {
    return [
      {
        question: "如何把握今年的关键节点？",
        badge: "事业",
        advice: "把项目拆成 3 个里程碑节点，每 4 周复盘一次",
        primary_surnames: "潘、李、穆",
        secondary_surnames: "管、和",
        colors: "青色、綠色",
        direction: "东南",
        palace: "职业选择"
      }
    ];
  }
  return list.map(s => ({
    raw_id: s.raw_id || "",
    display_question: s.display_question || "",
    palace: s.palace || "",
    direction: s.direction || "",
    advice: s.ai_advice || "",
    colors: Array.isArray(s.favorable_colors) ? s.favorable_colors.join("、") : (s.favorable_colors || ""),
    primary_surnames: Array.isArray(s.noble_surnames?.primary) ? s.noble_surnames.primary.join("、") : (s.noble_surnames?.primary || ""),
    secondary_surnames: Array.isArray(s.noble_surnames?.secondary) ? s.noble_surnames.secondary.join("、") : (s.noble_surnames?.secondary || ""),
    strategy: s.source_fields?.strategy || "",
    main_element: s.source_fields?.main_element || "",
    question: s.display_question || "",
    badge: s.palace || "",
    clue: Array.isArray(s.favorable_colors) ? s.favorable_colors.join("、") : (s.favorable_colors || ""),
    color: Array.isArray(s.favorable_colors) ? s.favorable_colors.join("、") : (s.favorable_colors || ""),
    theme: s.palace || ""
  }));
});

// ====== fengshui_advice 动态数据 ======
const fengshuiSourceEndpoint = computed(() => getDR("fengshui_advice.source_endpoint", ""));
const fengshuiSamples = computed(() => {
  const list = getDR("fengshui_advice.samples", []);
  if (!Array.isArray(list)) return [];
  return list.map(s => ({
    elementClass: "default",
    // 方向/元素
    element: s.direction || "",
    direction: s.direction || "",
    // 标题
    title: s.label || s.palace || "",
    badge: s.palace || s.label || "",
    // 完整建议
    desc: s.ai_advice || s.strategy || "",
    // 颜色 - 从数组转字符串
    color: Array.isArray(s.favorable_colors) ? s.favorable_colors.join("、") : (s.favorable_colors || ""),
    favorable_color: Array.isArray(s.favorable_colors) ? s.favorable_colors.join("、") : (s.favorable_colors || ""),
    // 协作线索 - 贵人姓氏
    clue: (() => {
      const p = s.noble_surnames?.primary;
      const sc = s.noble_surnames?.secondary;
      let parts = [];
      if (Array.isArray(p) && p.length) parts.push(p.join("、"));
      if (Array.isArray(sc) && sc.length) parts.push(sc.join("、"));
      return parts.length ? parts.join(" / ") : "";
    })(),
    // 生活主题
    theme: s.palace || s.label || "",
    palace: s.palace || "",
    // 空间小物 - 数组转字符串
    items: Array.isArray(s.items) ? s.items.join("；") : (s.items || ""),
    suggested_items: Array.isArray(s.items) ? s.items.join("；") : (s.items || ""),
    // 象征图案 - 数组转字符串
    symbol: Array.isArray(s.symbolic_shapes) ? s.symbolic_shapes.join("；") : (s.symbolic_shapes || ""),
    suggested_symbol: Array.isArray(s.symbolic_shapes) ? s.symbolic_shapes.join("；") : (s.symbolic_shapes || ""),
    // 策略
    strategy: s.strategy || ""
  }));
});

// future_guidance 补充
const futureGuidanceSource = computed(() => getDR("future_guidance.source", ""));

// 年度四化补充
const annualSihuaTheme = computed(() => {
  const val = getDR("annual_rhythm.sihua_theme", null);
  return val && typeof val === "object" ? val : null;
});

// 空间五建议 - 从 API available_fields 动态渲染
const fengshuiFieldIcons = [
  getStaticPath("images/life-report/position-icon.png"),
  getStaticPath("images/life-report/ring-icon.png"),
  getStaticPath("images/life-report/book-icon.png"),
  getStaticPath("images/life-report/date-icon.png"),
  getStaticPath("images/life-report/ring-icon.png")
];
const fengshuiFields = computed(() => {
  const list = getDR("fengshui_advice.available_fields", []);
  if (!Array.isArray(list) || list.length === 0) {
    return [
      { icon: getStaticPath("images/life-report/position-icon.png"), label: "整理方向", sub: "", desc: "空间整理或摆放方向参考。" },
      { icon: getStaticPath("images/life-report/ring-icon.png"), label: "舒缓颜色", sub: "", desc: "用于环境色彩或随身搭配。" },
      { icon: getStaticPath("images/life-report/book-icon.png"), label: "空间小物", sub: "", desc: "用户端建议转译为日常可见的小物件。" },
      { icon: getStaticPath("images/life-report/date-icon.png"), label: "象征图案", sub: "", desc: "用于贴纸、卡片、桌面图案等轻量表达。" },
      { icon: getStaticPath("images/life-report/ring-icon.png"), label: "协作线索", sub: "", desc: "人际协作趣味参考，不承诺具体对象。" }
    ];
  }
  return list.map((f, i) => ({
    icon: fengshuiFieldIcons[i % fengshuiFieldIcons.length],
    label: f.field || "",
    sub: "",
    desc: f.desc || ""
  }));
});
const fengshuiCorners = [
  {
    element: "东",
    elementClass: "east",
    title: "东方·生机",
    badge: "事业",
    desc: "东方对应事业与起点，适合摆放书桌或绿植。",
    color: "木绿",
    clue: "事业起步",
    theme: "立业",
    items: "小型绿植 / 文昌塔",
    symbol: "竹 / 书",
    strategy: "保持整洁 + 自然光"
  },
  {
    element: "南",
    elementClass: "south",
    title: "南方·声誉",
    badge: "关系",
    desc: "南方对应声誉与人际，暖色调更利表达。",
    color: "暖橙",
    clue: "对外表达",
    theme: "关系",
    items: "暖色灯 / 照片墙",
    symbol: "太阳 / 花",
    strategy: "明亮 + 整洁"
  }
];

// 年度轻调适 - 从 API 动态渲染
const lightAdjustItems = computed(() => {
  const period = getDR("ten_year_journey.period", "");
  const targetYear = getDR("report_meta.target_year", new Date().getFullYear());
  const tags = getDR("ten_year_journey.tags", []);
  return [
    { label: "当前阶段", value: period || "—", icon: getStaticPath("images/life-report/position-icon.png") },
    { label: "年度", value: String(targetYear) + "年度", icon: getStaticPath("images/life-report/date-icon.png") },
    { label: "年度关键词", value: Array.isArray(tags) && tags.length > 0 ? tags.join("、") : "—", icon: getStaticPath("images/life-report/book-icon.png") }
  ];
});
const rhythmDetail = computed(() => {
  const annualSummary = getDR("annual_rhythm.summary", "");
  const annualTitle = getDR("annual_rhythm.title", "");
  const sihuaSummary = getDR("annual_rhythm.sihua_theme.summary", "");
  const tags = getDR("ten_year_journey.tags", []);
  // 从 annual_rhythm.sihua_theme.transformations 提取关键词
  const transformations = getDR("annual_rhythm.sihua_theme.transformations", []);
  const keywords = transformations.map(t => t.star).filter(Boolean);
  return {
    label: "年度节奏与生活主题",
    title: annualTitle || "先稳节奏，再做选择",
    desc: sihuaSummary || annualSummary || "把重要事项拆成沟通、财务、出行、身心四类清单，优先处理能降低压力和误会的动作。",
    icon: getStaticPath("images/life-report/book-icon.png"),
    tags: [
      { label: "方向", value: (() => {
        const fs = fengshuiSamples.value;
        if (fs.length > 0 && fs[0].direction) return fs[0].direction;
        return getDR("annual_rhythm.sihua_theme.transformations.0.palace", "东南");
      })() },
      { label: "颜色", value: (() => {
        const fs = fengshuiSamples.value;
        if (fs.length > 0 && fs[0].color) return fs[0].color;
        const colors = getDR("annual_rhythm.sihua_theme.transformations.0.star", "");
        return colors || "清爽色、稳定色";
      })() },
      { label: "协作线索", value: (() => {
        const fs = fengshuiSamples.value;
        if (fs.length > 0 && fs[0].clue) return fs[0].clue;
        const p = getDR("annual_rhythm.sihua_theme.transformations.0.star", "");
        return p || "程、宋、林";
      })() }
    ]
  };
});

const disclaimerText = computed(() => reportData.value.disclaimer || "内容仅作为传统文化娱乐参考，不构成医疗、法律、金融、投资、婚恋或人生重大决策建议。");

// 下载报告
const downloadReport = async () => {
  if (isDownloading.value) return;
  try {
    isDownloading.value = true;
    uni.showLoading({ title: "正在生成报告..." });
    // 构建完整报告数据
    const reportJson = JSON.stringify(genData.value, null, 2);
    const fileName = `人生报告_${reportData.value.targetYear || new Date().getFullYear()}.json`;
    // #ifdef H5
    const blob = new Blob([reportJson], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    // #endif
    // #ifndef H5
    const savedFilePath = `${uni.env.USER_DATA_PATH}/${fileName}`;
    const fs = uni.getFileSystemManager();
    fs.writeFile({
      filePath: savedFilePath,
      data: reportJson,
      encoding: "utf8",
      success: () => {
        uni.hideLoading();
        uni.showToast({ title: "报告已保存", icon: "none" });
      },
      fail: () => {
        uni.hideLoading();
        uni.showToast({ title: "下载失败", icon: "none" });
      }
    });
    // #endif
  } catch (e) {
    uni.hideLoading();
    uni.showToast({ title: "下载失败", icon: "none" });
    console.error("[downloadReport] error", e);
  } finally {
    isDownloading.value = false;
  }
};

// 回到顶部
const showBackTop = ref(false);
const scrollToTop = () => {
  uni.pageScrollTo({ scrollTop: 0, duration: 300 });
};
const scrollToSection = (id) => {
  // h5 端 selector 跳转
  // #ifdef H5
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
  // #endif
};

onPageScroll((e) => {
  showBackTop.value = e.scrollTop > 600;
});
</script>

<template>
  <view class="life-result-page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-container">
      <view class="loading-spinner">
        <view
          class="loading-dot-wrap"
          v-for="i in 8"
          :key="i"
          :style="{ transform: `rotate(${(i - 1) * 45}deg) translateY(-36rpx)` }"
        >
          <view class="loading-dot" />
        </view>
      </view>
      <text class="loading-text">{{ tr("正在生成人生报告...") }}</text>
      <text class="loading-sub">{{ tr("请耐心等待") }}</text>
    </view>

    <!-- 错误提示 -->
    <view v-else-if="errorMsg" class="error-container">
      <text class="error-text">{{ errorMsg }}</text>
      <view class="error-btn" @click="uni.navigateBack()">{{ tr("返回重试") }}</view>
    </view>

    <template v-else-if="reportData">
      <!-- 顶部背景 -->
      <image class="top-bg" :src="getStaticPath('images/life-report/result-top.png')" mode="aspectFill" />

      <NavBar :showBack="true" backgroundColor="transparent" titleColor="#1f2937" backColor="#1f2937" :fixed="false" />
      <view class="page-header-actions">
        <view class="download-btn" @click="downloadReport" :class="{ 'btn-loading': isDownloading }">
          <text class="download-icon">↓</text>
          <text class="download-btn-text">{{ isDownloading ? tr("生成中...") : tr("下载报告") }}</text>
        </view>
      </view>
      <view class="page-body">
        <view class="page-title">{{ tr("人生报告") }}</view>
        <view class="page-desc">{{
          tr(
            "这是一份把长期节奏、年度重点和月度提醒整理成生活行动的报告。先看今年主旋律，再看未来指引，最后按月份慢慢参考。"
          )
        }}</view>
        <view class="page-top-card">
          <view class="top-card-item" v-for="(item, index) in topCardItems" :key="index">
            <view class="top-card-label">{{ item.label }}</view>
            <view class="top-card-value">{{ item.value }}</view>
          </view>
        </view>

        <!-- 快速导航 -->
        <view v-if="false" class="quick-nav">
          <scroll-view class="quick-nav-scroll" scroll-x :show-scrollbar="false">
            <view class="quick-nav-inner">
              <view
                class="quick-nav-item"
                v-for="(item, i) in navSections"
                :key="i"
                @click="scrollToSection(item.id)"
              >
                <text class="quick-nav-text">{{ item.label }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view id="fast-read" class="fast-read">
          <view class="fast-read-title">{{ tr("快速阅读") }}</view>
          <view class="fast-read-grid">
            <view class="fast-read-item" v-for="(item, index) in fastReadItems" :key="index">
              <image class="fast-read-icon" :src="item.icon" mode="aspectFit" />
              <view class="fast-read-text">
                <text class="fast-read-label">{{ item.label }}</text>
                <text class="fast-read-value">{{ item.value }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 十年行旅 -->
        <view id="decade-card" class="decade-card">
          <view class="decade-title">{{ tr("十年行旅") }}</view>

          <!-- 阶段卡片 -->
          <view class="decade-stage">
            <view class="decade-stage-left">
              <text class="decade-stage-label">{{ tr("阶段") }}</text>
              <text class="decade-stage-age">{{ decadePeriod }}</text>
            </view>
            <view class="decade-stage-right">
              <text class="decade-stage-hint">{{ tr("长期阶段参考") }}</text>
              <text class="decade-stage-name">{{ decadeMainRhythm }}</text>
              <text class="decade-stage-desc">{{ decadeSummary }}</text>
            </view>
          </view>

          <!-- 标签行 -->
          <view class="decade-tags">
            <view class="decade-tag" v-for="(tag, i) in decadeTags" :key="i">{{ tag }}</view>
          </view>

          <view class="decade-divider" />

          <!-- 十年核心主题 -->
          <view class="decade-core-title">{{ tr("十年核心主题") }}</view>
          <view class="decade-core-desc">{{ decadeSihuaSummary }}</view>

          <!-- 主题卡片列表 -->
          <view class="decade-theme-list">
            <view
              class="decade-theme-card"
              v-for="(item, i) in decadeThemes"
              :key="i"
              :style="{ backgroundColor: item.bg }"
            >
              <text class="decade-theme-tag">{{ item.tag }}</text>
              <text class="decade-theme-title">{{ item.title }}</text>
              <text class="decade-theme-desc">{{ item.desc }}</text>
            </view>
          </view>

          <view class="decade-divider" />

          <!-- 十二个生活主题 -->
          <view class="life-themes-title">{{ tr("十二个生活主题") }}</view>
          <view class="life-themes-grid">
            <view class="life-theme-card" v-for="(item, i) in displayedLifeThemes" :key="i">
              <image class="life-theme-icon" :src="item.icon" mode="aspectFit" />
              <text class="life-theme-name">{{ item.title }}</text>
              <text class="life-theme-desc">{{ item.desc }}</text>
            </view>
          </view>

          <view class="life-themes-toggle" @click="toggleLifeThemes">
            <text class="life-themes-toggle-text">
              {{ lifeThemesExpanded ? tr("收起") : tr("展开全部12个主题") }}
            </text>
            <text class="life-themes-toggle-arrow" :class="{ 'life-themes-toggle-arrow--up': lifeThemesExpanded }">▼</text>
          </view>
        </view>

        <!-- 年度核心主题 -->
        <view id="annual-card" class="annual-card">
          <!-- 年度节奏主旋律 -->
          <view class="annual-rhythm">
            <view class="annual-rhythm-text">
              <text class="annual-rhythm-title">{{ annualRhythmTitle }}</text>
              <text class="annual-rhythm-desc">{{ annualRhythmDesc }}</text>
            </view>
            <image
              class="annual-rhythm-img"
              :src="getStaticPath('images/life-report/annual-rhythm.png')"
              mode="aspectFit"
            />
          </view>

          <view class="annual-divider" />

          <!-- 年度核心主题 -->
          <view class="annual-core">
            <text class="annual-core-title">{{ tr("年度核心主题") }}</text>
            <text class="annual-core-desc">{{ annualCoreDesc }}</text>
          </view>

          <!-- 年度主题卡片列表 -->
          <view class="annual-theme-list">
            <view
              class="annual-theme-card"
              v-for="(item, i) in annualThemeCards"
              :key="i"
              :style="{ backgroundColor: item.bg }"
            >
              <text class="annual-theme-tag">{{ item.tag }}</text>
              <text class="annual-theme-title">{{ item.title }}</text>
              <text class="annual-theme-desc">{{ item.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 每月旋律 -->
        <view id="monthly-card" class="monthly-card">
          <text class="monthly-title">{{ tr("每月旋律") }}</text>

          <!-- 月份 Tab 横向滚动 -->
          <view class="monthly-tabs-wrapper">
            <scroll-view class="monthly-tabs-scroll" scroll-x :show-scrollbar="false">
              <view class="monthly-tabs">
                <view
                  class="monthly-tab"
                  v-for="(m, i) in months"
                  :key="i"
                  :class="{ 'monthly-tab--active': selectedMonth === i + 1 }"
                  @click="selectMonth(i + 1)"
                >
                  <text class="monthly-tab-text">{{ m }}</text>
                </view>
              </view>
            </scroll-view>
            <view class="monthly-tabs-fade" />
          </view>

          <!-- 月份内容卡片 -->
          <view class="monthly-content">
            <view class="monthly-content-left">
              <text class="monthly-content-month">{{ selectedMonth }}{{ tr("月") }}</text>
            </view>
            <view class="monthly-content-right">
              <text class="monthly-content-title">{{ monthContents.title }}</text>
              <text class="monthly-content-desc">{{ monthContents.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 年度生活节奏指引 -->
        <view id="guide-card" class="guide-card">
          <text class="guide-time">{{ tr("时间参考") }}：{{ targetYear }} · {{ annualStemBranch || tr("常年") }}</text>
          <text class="guide-title">{{ annualRhythmTitle }}</text>
          <text class="guide-desc">{{ annualRhythmDesc }}</text>
        </view>

        <!-- 未来指引 -->
        <view id="future-card" class="future-card">
          <text class="future-title">{{ futureGuidanceTitle }}</text>
          <text class="future-desc">{{ futureGuidanceSummary }}</text>
        </view>

        <!-- 生活十问 & 空间建议 -->
      <view class="extras-card">
        <!-- 生活十问 -->
        <text class="extras-section-title">{{ tr("生活十问") }}</text>

        <!-- 可用字段 -->
        <view class="extras-fields">
          <view class="extras-field-row" v-for="(f, i) in tenQuestionsFields" :key="i">
            <image class="extras-field-icon" :src="f.icon" mode="aspectFit" />
            <view class="extras-field-text">
              <view class="extras-field-header">
                <text class="extras-field-label">{{ f.label }}</text>
                <text v-if="f.sub" class="extras-field-sub">{{ f.sub }}</text>
              </view>
              <text class="extras-field-desc">{{ f.desc }}</text>
            </view>
          </view>
        </view>

        <view class="extras-divider" />

        <!-- 支持的不同时序 -->
        <text class="extras-section-title">{{ tr("支持的不同时序") }}</text>
        <view class="extras-time-levels">
          <view class="extras-time-row" v-for="(t, i) in tenQuestionsTimeLevels" :key="i" :style="{ backgroundColor: t.bg }">
            <view class="extras-time-text">
              <text class="extras-time-label">{{ t.label }}</text>
              <text class="extras-time-desc">{{ t.desc }}</text>
            </view>
          </view>
        </view>

        <view class="extras-divider" />

        <!-- 十个年度问题 -->
        <text class="extras-section-title">{{ tr("十个年度问题") }}</text>
        <view class="extras-questions">
          <view class="extras-question-card" v-for="(q, i) in tenQuestionsSamples" :key="i">
            <view class="extras-question-header">
              <text class="extras-question-name">{{ q.display_question || q.question }}</text>
              <view class="extras-question-badge">
                <text class="extras-question-badge-text">{{ q.palace || q.badge }}</text>
              </view>
            </view>
            <!-- 方位 -->
            <view v-if="q.direction" class="extras-qtag" style="margin-bottom: 8rpx;">
              <text class="extras-qtag-label">{{ tr("方位") }}</text>
              <text class="extras-qtag-value">{{ q.direction }}</text>
            </view>
            <!-- 建议（AI 生成的详细文本） -->
            <text class="extras-question-advice" style="margin-bottom: 12rpx;">{{ q.advice }}</text>
            <view class="extras-question-tags">
              <view class="extras-qtag" v-if="q.colors">
                <text class="extras-qtag-label">{{ tr("幸运颜色") }}</text>
                <text class="extras-qtag-value">{{ q.colors }}</text>
              </view>
              <view class="extras-qtag" v-if="q.primary_surnames">
                <text class="extras-qtag-label">{{ tr("首选贵人姓") }}</text>
                <text class="extras-qtag-value">{{ q.primary_surnames }}</text>
              </view>
              <view class="extras-qtag" v-if="q.secondary_surnames">
                <text class="extras-qtag-label">{{ tr("次选贵人姓") }}</text>
                <text class="extras-qtag-value">{{ q.secondary_surnames }}</text>
              </view>
              <view class="extras-qtag" v-if="q.strategy">
                <text class="extras-qtag-label">{{ tr("策略") }}</text>
                <text class="extras-qtag-value">{{ q.strategy }}</text>
              </view>
              <view class="extras-qtag" v-if="q.main_element">
                <text class="extras-qtag-label">{{ tr("五行") }}</text>
                <text class="extras-qtag-value">{{ q.main_element }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="extras-divider" />

        <!-- 空间五建议 -->
        <text class="extras-section-title">{{ tr("旁边功能：空间五建议") }}</text>
        <view class="extras-fields">
          <view class="extras-field-row" v-for="(f, i) in fengshuiFields" :key="i">
            <image class="extras-field-icon" :src="f.icon" mode="aspectFit" />
            <view class="extras-field-text">
              <view class="extras-field-header">
                <text class="extras-field-label">{{ f.label }}</text>
                <text v-if="f.sub" class="extras-field-sub">{{ f.sub }}</text>
              </view>
              <text class="extras-field-desc">{{ f.desc }}</text>
            </view>
          </view>
        </view>

        <view class="extras-divider" />

        <!-- 空间五建议完整样例 -->
        <view class="extras-fengshui-samples">
          <view
            class="fengshui-corner-card"
            :class="'fengshui-corner-card--' + (corner.elementClass || 'default')"
            v-for="(corner, i) in fengshuiSamples.length > 0 ? fengshuiSamples : fengshuiCorners"
            :key="i"
          >
            <!-- 六格建议网格 -->
            <view class="fengshui-corner-grid">
              <view class="fengshui-grid-item">
                <text class="fengshui-grid-label">{{ tr("颜色") }}</text>
                <text class="fengshui-grid-value">{{ corner.color || corner.favorable_color || "" }}</text>
              </view>
              <view class="fengshui-grid-item">
                <text class="fengshui-grid-label">{{ tr("协作线索") }}</text>
                <text class="fengshui-grid-value">{{ corner.clue || "" }}</text>
              </view>
              <view class="fengshui-grid-item">
                <text class="fengshui-grid-label">{{ tr("生活主题") }}</text>
                <text class="fengshui-grid-value">{{ corner.theme || corner.palace || "" }}</text>
              </view>
              <view class="fengshui-grid-item">
                <text class="fengshui-grid-label">{{ tr("空间小物") }}</text>
                <text class="fengshui-grid-value">{{ corner.items || corner.suggested_items || "" }}</text>
              </view>
              <view class="fengshui-grid-item">
                <text class="fengshui-grid-label">{{ tr("象征图案") }}</text>
                <text class="fengshui-grid-value">{{ corner.symbol || corner.suggested_symbol || "" }}</text>
              </view>
              <view class="fengshui-grid-item">
                <text class="fengshui-grid-label">{{ tr("策略") }}</text>
                <text class="fengshui-grid-value">{{ corner.strategy || "" }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 年度轻调适 -->
      <view id="adjust-card" class="adjust-card">
        <text class="adjust-title">{{ tr("年度轻调适") }}</text>
        <text class="adjust-desc">{{
          tr(
            "这一栏把年度节奏转成可执行的小动作：先整理空间，再整理关系，最后整理行动顺序。所有内容只作轻量生活提醒，不承诺任何现实结果。"
          )
        }}</text>

        <!-- 信息行 -->
        <view class="adjust-row" v-for="(item, i) in lightAdjustItems" :key="i">
          <view class="adjust-row-text">
            <text class="adjust-row-label">{{ item.label }}</text>
            <text class="adjust-row-value">{{ item.value }}</text>
          </view>
          <image class="adjust-row-icon" :src="item.icon" mode="aspectFit" />
        </view>

        <!-- 年度节奏详情卡片 -->
        <view class="adjust-detail">
          <view class="adjust-detail-main">
            <view class="adjust-detail-text">
              <text class="adjust-detail-label">{{ rhythmDetail.label }}</text>
              <text class="adjust-detail-title">{{ rhythmDetail.title }}</text>
              <text class="adjust-detail-desc">{{ rhythmDetail.desc }}</text>
            </view>
            <image class="adjust-detail-icon" :src="rhythmDetail.icon" mode="aspectFit" />
          </view>
          <view class="adjust-detail-tags">
            <view class="adjust-tag" v-for="(tag, j) in rhythmDetail.tags" :key="j">
              <text class="adjust-tag-label">{{ tag.label }}</text>
              <text class="adjust-tag-value">{{ tag.value }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 免责声明 -->
        <view class="disclaimer">
          <text>{{ disclaimerText }}</text>
        </view>
      </view>

      <!-- 回到顶部 -->
      <view v-if="showBackTop" class="back-top" @click="scrollToTop">
        <text class="back-top-arrow">▲</text>
      </view>
    </template>

    <!-- 错误状态 -->
    <view v-else class="error-container">
      <view class="error-card">
        <text class="error-icon">⚠️</text>
        <text class="error-title">{{ errorMsg || tr("加载失败") }}</text>
        <text class="error-desc">{{ tr("请返回重试") }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.life-result-page {
  min-height: 100vh;
  background-color: #f7f7f3;
  box-sizing: border-box;
  // ----- 加载中 -----
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 24rpx;
  }

  .loading-spinner {
    position: relative;
    width: 120rpx;
    height: 120rpx;
  }

  .loading-dot-wrap {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 12rpx;
    height: 12rpx;
    margin-left: -6rpx;
    margin-top: -6rpx;
  }

  .loading-dot {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    animation: loadingFade 1.2s linear infinite;
  }

  .loading-dot-wrap {
    &:nth-child(1) .loading-dot {
      animation-delay: 0s;
      background: #fcd34d;
    }
    &:nth-child(2) .loading-dot {
      animation-delay: 0.15s;
      background: #fbbf24;
    }
    &:nth-child(3) .loading-dot {
      animation-delay: 0.3s;
      background: #f59e0b;
    }
    &:nth-child(4) .loading-dot {
      animation-delay: 0.45s;
      background: #d97706;
    }
    &:nth-child(5) .loading-dot {
      animation-delay: 0.6s;
      background: #fcd34d;
    }
    &:nth-child(6) .loading-dot {
      animation-delay: 0.75s;
      background: #fbbf24;
    }
    &:nth-child(7) .loading-dot {
      animation-delay: 0.9s;
      background: #f59e0b;
    }
    &:nth-child(8) .loading-dot {
      animation-delay: 1.05s;
      background: #d97706;
    }
  }

  @keyframes loadingFade {
    0%,
    100% {
      opacity: 0.2;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
  }

  .loading-text {
    font-size: 32rpx;
    font-weight: 600;
    color: #1f2937;
    letter-spacing: 2rpx;
  }

  .loading-sub {
    font-size: 24rpx;
    color: #9ca3af;
  }

  .top-bg {
    width: 750rpx;
    height: 720rpx;
    position: absolute;
    top: 0;
    left: 0;
  }

  .page-header-actions {
    position: absolute;
    top: calc(var(--status-bar-height) + 16rpx);
    right: 32rpx;
    z-index: 100;
  }

  .download-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12rpx 24rpx;
    background: rgba(255, 255, 255, 0.9);
    border: 1rpx solid #e5e7eb;
    border-radius: 40rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
    
    .download-icon {
      font-size: 24rpx;
      color: #374151;
      margin-right: 8rpx;
      transition: transform 0.2s;
    }
    
    .download-btn-text {
      font-size: 24rpx;
      color: #374151;
      font-weight: 500;
    }
    
    &.btn-loading {
      opacity: 0.7;
      pointer-events: none;
      
      .download-icon {
        animation: bounce 1s infinite;
      }
    }
    
    &:active {
      transform: scale(0.96);
      background: rgba(255, 255, 255, 0.85);
    }
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4rpx); }
  }

  .page-body {
    padding: 0 32rpx;
    position: relative;
    z-index: 2;

    // 全局文字换行兜底：防止任何长文本溢出
    view, text {
      word-break: break-all;
      overflow-wrap: break-word;
    }
    .page-title {
      font-size: 48rpx;
      font-weight: 700;
      color: #1f2937;
      letter-spacing: 2rpx;
    }

    .page-desc {
      font-size: 28rpx;
      line-height: 44rpx;
      margin-top: 20rpx;
      max-width: 100%;
      word-break: break-all;
    }

    .page-top-card {
      display: flex;
      align-items: flex-start;
      padding: 20rpx 32rpx;
      gap: 40rpx;
      width: 686rpx;
      margin: 32rpx auto 0;
      position: relative;
      border-radius: 16rpx;
      box-sizing: border-box;
      overflow: hidden;

      &::before {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(250, 233, 205, 0.03);
        border: 1rpx solid rgba(107, 93, 79, 0.5);
        border-radius: 16rpx;
        -webkit-backdrop-filter: blur(8rpx);
        backdrop-filter: blur(8rpx);
        z-index: 0;
      }

      > .top-card-item {
        position: relative;
        z-index: 1;
      }
      .top-card-item {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 8rpx;
      }

      .top-card-label {
        font-size: 24rpx;
        color: rgba(107, 93, 79, 0.7);
      }

      .top-card-value {
        font-size: 28rpx;
        color: #1f2937;
        font-weight: 500;
      }
    }
    // ----- 快速导航 -----
    .quick-nav {
      width: 686rpx;
      margin: 20rpx auto 0;
    }

    .quick-nav-scroll {
      width: 100%;
      white-space: nowrap;
    }

    .quick-nav-inner {
      display: flex;
      gap: 12rpx;
    }

    .quick-nav-item {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10rpx 24rpx;
      background: #ffffff;
      border: 1rpx solid #e5e7eb;
      border-radius: 40rpx;
      flex-shrink: 0;
      transition: all 0.2s;

      &:active {
        background: #fef4da;
        border-color: rgba(179, 122, 10, 0.5);
      }
    }

    .quick-nav-text {
      font-size: 24rpx;
      color: #374151;
      white-space: nowrap;
    }

    .fast-read {
      width: 686rpx;
      margin: 32rpx auto 0;
      background: #ffffff;
      border: 2rpx solid #f0f0f0;
      border-radius: 32rpx;
      box-shadow: 4rpx 4rpx 20rpx rgba(69, 30, 2, 0.04);
      padding: 32rpx;
      box-sizing: border-box;

      .fast-read-title {
        font-size: 32rpx;
        font-weight: 600;
        color: #000000;
        margin-bottom: 24rpx;
      }

      .fast-read-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 20rpx 22rpx;
      }

      .fast-read-item {
        display: flex;
        align-items: flex-start;
        gap: 8rpx;
        width: calc((100% - 22rpx) / 2);
        min-height: 112rpx;
        padding: 16rpx;
        background: #ffffff;
        border: 2rpx solid #f0f0f0;
        border-radius: 16rpx;
        box-sizing: border-box;
        flex-shrink: 0;
      }

      .fast-read-icon {
        width: 80rpx;
        height: 80rpx;
        border-radius: 16rpx;
        flex-shrink: 0;
      }

      .fast-read-text {
        display: flex;
        flex-direction: column;
        gap: 4rpx;
        flex: 1;
        min-width: 0;
      }

      .fast-read-label {
        font-size: 20rpx;
        color: #000000;
        line-height: 32rpx;
        word-break: break-all;
      }

      .fast-read-value {
        font-size: 24rpx;
        color: #000000;
        font-weight: 600;
        line-height: 36rpx;
        word-break: break-all;
        overflow-wrap: break-word;
      }
    }

    // ----- 十年行旅 -----
    .decade-card {
      width: 686rpx;
      margin: 32rpx auto 0;
      background: #ffffff;
      border: 2rpx solid #f0f0f0;
      border-radius: 32rpx;
      box-shadow: 4rpx 4rpx 20rpx rgba(69, 30, 2, 0.04);
      padding: 32rpx;
      box-sizing: border-box;
    }

    .decade-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #000000;
      margin-bottom: 24rpx;
    }

    .decade-stage {
      display: flex;
      gap: 20rpx;
      border: 1rpx solid rgba(179, 122, 10, 0.5);
      border-radius: 16rpx;
      overflow: hidden;
      margin-bottom: 20rpx;
    }

    .decade-stage-left {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4rpx;
      width: 154rpx;
      padding: 32rpx 20rpx;
      background: #fef4da;
      border-right: 1rpx solid rgba(179, 122, 10, 0.5);
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .decade-stage-label {
      font-size: 20rpx;
      color: #b37a0a;
      text-align: center;
    }

    .decade-stage-age {
      font-size: 28rpx;
      font-weight: 600;
      color: #b37a0a;
      text-align: center;
      line-height: 44rpx;
    }

    .decade-stage-right {
      display: flex;
      flex-direction: column;
      gap: 4rpx;
      flex: 1;
      padding: 8rpx 0;
      min-width: 0;
      overflow: hidden;
    }

    .decade-stage-hint {
      font-size: 20rpx;
      color: #a6a7ab;
    }

    .decade-stage-name {
      font-size: 28rpx;
      font-weight: 600;
      color: #111111;
      line-height: 44rpx;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    .decade-stage-desc {
      font-size: 24rpx;
      color: #111111;
      line-height: 36rpx;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    .decade-tags {
      display: flex;
      gap: 10rpx;
      margin-bottom: 16rpx;
    }

    .decade-tag {
      padding: 6rpx 12rpx;
      background: #fef4da;
      border: 1rpx solid rgba(179, 122, 10, 0.5);
      border-radius: 16rpx;
      font-size: 24rpx;
      color: #b37a0a;
      word-break: break-all;
    }
    .decade-tag--source {
      background: #eef6ff;
      border-color: rgba(59, 130, 246, 0.4);
      color: #2563eb;
    }

    // ----- source / endpoint 标签 -----
    .guide-source,
    .future-source,
    .extras-source-endpoint {
      font-size: 22rpx;
      color: #9ca3af;
      line-height: 32rpx;
      margin-top: 4rpx;
    }

    .decade-divider {
      width: 100%;
      height: 0;
      border-top: 2rpx dashed #f0f0f0;
      margin: 24rpx 0;
    }

    .decade-core-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #000000;
      margin-bottom: 16rpx;
    }

    .decade-core-desc {
      font-size: 28rpx;
      color: #111111;
      line-height: 44rpx;
      margin-bottom: 20rpx;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    .decade-theme-list {
      display: flex;
      flex-direction: column;
      gap: 20rpx;
    }

    .decade-theme-card {
      display: flex;
      flex-direction: column;
      gap: 4rpx;
      padding: 20rpx;
      border-radius: 16rpx;
    }

    .decade-theme-tag {
      font-size: 20rpx;
      color: #929292;
    }

    .decade-theme-title {
      font-size: 28rpx;
      font-weight: 600;
      color: #111111;
      line-height: 44rpx;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    .decade-theme-desc {
      font-size: 24rpx;
      color: #111111;
      line-height: 36rpx;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    .life-themes-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #000000;
      margin-bottom: 20rpx;
    }

    .life-themes-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 20rpx 22rpx;
    }

    .life-theme-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8rpx;
      width: calc((100% - 22rpx) / 2);
      padding: 20rpx;
      background: #ffffff;
      border: 2rpx solid #f0f0f0;
      border-radius: 16rpx;
      box-sizing: border-box;
    }

    .life-theme-icon {
      width: 64rpx;
      height: 64rpx;
      flex-shrink: 0;
    }

    .life-theme-name {
      font-size: 28rpx;
      font-weight: 600;
      color: #111111;
      text-align: center;
      line-height: 44rpx;
      word-break: break-all;
    }

    .life-theme-desc {
      font-size: 24rpx;
      color: #111111;
      line-height: 36rpx;
      text-align: center;
      word-break: break-all;
    }

    .life-themes-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8rpx;
      margin-top: 20rpx;
      padding: 16rpx 0;
      color: #b37a0a;
    }

    .life-themes-toggle-text {
      font-size: 24rpx;
      color: #b37a0a;
    }

    .life-themes-toggle-arrow {
      font-size: 20rpx;
      color: #b37a0a;
      transition: transform 0.3s;

      &--up {
        transform: rotate(180deg);
      }
    }

    // ----- 年度核心主题 -----
    .annual-card {
      width: 686rpx;
      margin: 32rpx auto 0;
      background: #ffffff;
      border: 2rpx solid #f0f0f0;
      border-radius: 32rpx;
      box-shadow: 4rpx 4rpx 20rpx rgba(69, 30, 2, 0.04);
      padding: 32rpx;
      box-sizing: border-box;
    }

    .annual-rhythm {
      display: flex;
      gap: 16rpx;
      align-items: flex-end;
    }

    .annual-rhythm-text {
      display: flex;
      flex-direction: column;
      gap: 16rpx;
      flex: 1;
      min-width: 0;
    }

    .annual-rhythm-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #000000;
      line-height: 48rpx;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    .annual-rhythm-desc {
      font-size: 28rpx;
      color: #111111;
      line-height: 44rpx;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    .annual-rhythm-img {
      width: 248rpx;
      height: 254rpx;
      flex-shrink: 0;
    }

    .annual-divider {
      width: 100%;
      height: 0;
      border-top: 2rpx dashed #f0f0f0;
      margin: 32rpx 0;
    }

    .annual-core {
      display: flex;
      flex-direction: column;
      gap: 16rpx;
      margin-bottom: 24rpx;
    }

    .annual-core-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #000000;
      line-height: 48rpx;
    }

    .annual-core-desc {
      font-size: 28rpx;
      color: #111111;
      line-height: 44rpx;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    .annual-theme-list {
      display: flex;
      flex-direction: column;
      gap: 20rpx;
    }

    .annual-theme-card {
      display: flex;
      flex-direction: column;
      gap: 4rpx;
      padding: 20rpx;
      border-radius: 16rpx;
    }

    .annual-theme-tag {
      font-size: 20rpx;
      color: #929292;
    }

    .annual-theme-title {
      font-size: 28rpx;
      font-weight: 600;
      color: #111111;
      line-height: 44rpx;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    .annual-theme-desc {
      font-size: 24rpx;
      color: #111111;
      line-height: 36rpx;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    // ----- 每月旋律 -----
    .monthly-card {
      width: 686rpx;
      margin: 32rpx auto 0;
      background: #ffffff;
      border: 2rpx solid #f0f0f0;
      border-radius: 32rpx;
      box-shadow: 4rpx 4rpx 20rpx rgba(69, 30, 2, 0.04);
      padding: 32rpx;
      box-sizing: border-box;
    }

    .monthly-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #000000;
      line-height: 48rpx;
      display: block;
      margin-bottom: 16rpx;
    }

    .monthly-tabs-wrapper {
      position: relative;
      margin-bottom: 20rpx;
    }

    .monthly-tabs-scroll {
      width: 100%;
      white-space: nowrap;
    }

    .monthly-tabs {
      display: flex;
      gap: 10rpx;
      padding-right: 40rpx;
    }

    .monthly-tab {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 64rpx;
      height: 64rpx;
      background: #ffffff;
      border: 1rpx solid #f0f0f0;
      border-radius: 16rpx;
      flex-shrink: 0;
    }

    .monthly-tab--active {
      background: #fef4da;
      border: 1rpx solid rgba(179, 122, 10, 0.5);

      .monthly-tab-text {
        color: #b37a0a;
      }
    }

    .monthly-tab-text {
      font-size: 24rpx;
      color: #111111;
    }

    .monthly-tabs-fade {
      position: absolute;
      right: 0;
      top: 0;
      width: 32rpx;
      height: 64rpx;
      background: #ffffff;
      border-right: 2rpx solid #f0f0f0;
    }

    .monthly-content {
      display: flex;
      border: 1rpx solid rgba(179, 122, 10, 0.5);
      border-radius: 16rpx;
      overflow: hidden;
    }

    .monthly-content-left {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 154rpx;
      padding: 32rpx 20rpx;
      background: #fef4da;
      border-right: 1rpx solid rgba(179, 122, 10, 0.5);
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .monthly-content-month {
      font-size: 28rpx;
      font-weight: 600;
      color: #b37a0a;
      text-align: center;
    }

    .monthly-content-right {
      display: flex;
      flex-direction: column;
      gap: 4rpx;
      flex: 1;
      padding: 16rpx 20rpx;
      min-width: 0;
    }

    .monthly-content-title {
      font-size: 28rpx;
      font-weight: 600;
      color: #111111;
      line-height: 44rpx;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    .monthly-content-desc {
      font-size: 24rpx;
      color: #111111;
      line-height: 36rpx;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    // ----- 年度生活节奏指引 -----
    .guide-card {
      width: 686rpx;
      margin: 32rpx auto 0;
      background: #ffffff;
      border: 2rpx solid #f0f0f0;
      border-radius: 32rpx;
      box-shadow: 4rpx 4rpx 20rpx rgba(69, 30, 2, 0.04);
      padding: 32rpx;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 16rpx;
    }

    .guide-time {
      font-size: 24rpx;
      color: #929292;
      word-break: break-all;
    }

    .guide-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #000000;
      line-height: 48rpx;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    .guide-desc {
      font-size: 28rpx;
      color: #111111;
      line-height: 44rpx;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    // ----- birth-detail (出生详情) -----
    .birth-detail {
      display: flex;
      flex-direction: column;
      gap: 8rpx;
      width: 686rpx;
      margin: 12rpx auto 0;
      padding: 16rpx 20rpx;
      background: rgba(250, 233, 205, 0.15);
      border: 1rpx solid rgba(179, 122, 10, 0.3);
      border-radius: 12rpx;
      box-sizing: border-box;
    }
    .birth-detail-row {
      display: flex;
      align-items: center;
      gap: 12rpx;
    }
    .birth-detail-label {
      font-size: 22rpx;
      color: #b37a0a;
      flex-shrink: 0;
    }
    .birth-detail-value {
      font-size: 22rpx;
      color: #1f2937;
      font-weight: 500;
    }

    // ----- report-meta (报告元信息) -----
    .report-meta {
      width: 686rpx;
      margin: 8rpx auto 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6rpx;
    }
    .report-meta-text {
      font-size: 20rpx;
      color: #9ca3af;
      line-height: 32rpx;
    }

    // ----- future-card (未来指引) -----
    .future-card {
      width: 686rpx;
      margin: 32rpx auto 0;
      background: #ffffff;
      border: 2rpx solid #f0f0f0;
      border-radius: 32rpx;
      box-shadow: 4rpx 4rpx 20rpx rgba(69, 30, 2, 0.04);
      padding: 32rpx;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 16rpx;
    }
    .future-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #000000;
      line-height: 48rpx;
      word-break: break-all;
    }
    .future-desc {
      font-size: 28rpx;
      color: #111111;
      line-height: 44rpx;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    // ----- 年度轻调适 -----
    .adjust-card {
      width: 686rpx;
      margin: 32rpx auto 0;
      background: #ffffff;
      border: 2rpx solid #f0f0f0;
      border-radius: 32rpx;
      box-shadow: 4rpx 4rpx 20rpx rgba(69, 30, 2, 0.04);
      padding: 32rpx;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 20rpx;
    }

    .adjust-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #000000;
      line-height: 48rpx;
    }

    .adjust-desc {
      font-size: 28rpx;
      color: #111111;
      line-height: 44rpx;
    }

    .adjust-row {
      display: flex;
      align-items: center;
      gap: 72rpx;
      padding: 20rpx;
      border: 1rpx solid #f0f0f0;
      border-radius: 16rpx;
    }

    .adjust-row-text {
      display: flex;
      flex-direction: column;
      gap: 8rpx;
      flex: 1;
      min-width: 0;
    }

    .adjust-row-label {
      font-size: 24rpx;
      color: #929292;
    }

    .adjust-row-value {
      font-size: 28rpx;
      font-weight: 600;
      color: #111111;
      line-height: 44rpx;
    }

    .adjust-row-icon {
      width: 96rpx;
      height: 96rpx;
      flex-shrink: 0;
    }

    .adjust-detail {
      display: flex;
      flex-direction: column;
      gap: 12rpx;
      padding: 20rpx;
      border: 1rpx solid #f0f0f0;
      border-radius: 16rpx;
    }

    .adjust-detail-main {
      display: flex;
      gap: 16rpx;
    }

    .adjust-detail-text {
      display: flex;
      flex-direction: column;
      gap: 8rpx;
      flex: 1;
      min-width: 0;
    }

    .adjust-detail-label {
      font-size: 24rpx;
      color: #929292;
    }

    .adjust-detail-title {
      font-size: 28rpx;
      font-weight: 600;
      color: #111111;
      line-height: 44rpx;
    }

    .adjust-detail-desc {
      font-size: 28rpx;
      color: #111111;
      line-height: 44rpx;
    }

    .adjust-detail-icon {
      width: 96rpx;
      height: 96rpx;
      flex-shrink: 0;
    }

    .adjust-detail-tags {
      display: flex;
      gap: 16rpx;
    }

    .adjust-tag {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4rpx;
      flex: 1;
      padding: 12rpx 16rpx;
      background: #ffffff;
      border: 2rpx solid #f0f0f0;
      border-radius: 16rpx;
      box-sizing: border-box;
    }

    .adjust-tag-label {
      font-size: 20rpx;
      color: #929292;
    }

    .adjust-tag-value {
      font-size: 24rpx;
      font-weight: 600;
      color: #111111;
      line-height: 36rpx;
      text-align: center;
    }

    // ----- 生活十问 & 空间建议 -----
    .extras-card {
      width: 686rpx;
      margin: 32rpx auto 0;
      background: #ffffff;
      border: 2rpx solid #f0f0f0;
      border-radius: 32rpx;
      box-shadow: 4rpx 4rpx 20rpx rgba(69, 30, 2, 0.04);
      padding: 32rpx;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 20rpx;
    }

    .extras-section-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #000000;
      line-height: 48rpx;
      display: block;
    }

    .extras-divider {
      width: 100%;
      height: 0;
      border-top: 2rpx dashed #f0f0f0;
    }

    // 字段列表
    .extras-fields {
      display: flex;
      flex-direction: column;
      gap: 10rpx;
    }

    .extras-field-row {
      display: flex;
      align-items: center;
      gap: 16rpx;
      padding: 20rpx;
      border: 1rpx solid #f0f0f0;
      border-radius: 16rpx;
    }

    .extras-field-icon {
      width: 64rpx;
      height: 64rpx;
      flex-shrink: 0;
    }

    .extras-field-text {
      display: flex;
      flex-direction: column;
      gap: 8rpx;
      flex: 1;
      min-width: 0;
    }

    .extras-field-header {
      display: flex;
      align-items: center;
      gap: 8rpx;
    }

    .extras-field-label {
      font-size: 28rpx;
      font-weight: 600;
      color: #111111;
      line-height: 44rpx;
    }

    .extras-field-sub {
      font-size: 24rpx;
      color: #a6a7ab;
      line-height: 44rpx;
    }

    .extras-field-desc {
      font-size: 24rpx;
      color: #111111;
    }

    // 时序选择
    .extras-time-levels {
      display: flex;
      flex-direction: column;
      gap: 10rpx;
    }

    .extras-time-row {
      display: flex;
      align-items: center;
      padding: 20rpx 20rpx;
      border-radius: 16rpx;
    }

    .extras-time-text {
      display: flex;
      flex-direction: column;
      gap: 8rpx;
    }

    .extras-time-label {
      font-size: 28rpx;
      font-weight: 600;
      color: #111111;
      line-height: 44rpx;
    }

    .extras-time-desc {
      font-size: 24rpx;
      color: #111111;
    }

    // 问题卡片
    .extras-questions {
      display: flex;
      flex-direction: column;
      gap: 20rpx;
    }

    .extras-question-card {
      display: flex;
      flex-direction: column;
      gap: 12rpx;
      padding: 24rpx;
      border: 1rpx solid #f0f0f0;
      border-radius: 16rpx;
    }

    .extras-question-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16rpx;
    }

    .extras-question-name {
      font-size: 28rpx;
      font-weight: 600;
      color: #111111;
      line-height: 44rpx;
      flex-shrink: 0;
    }

    .extras-question-badge {
      padding: 2rpx 8rpx 6rpx;
      background: #fef4da;
      border: 1rpx solid rgba(179, 122, 10, 0.5);
      border-radius: 8rpx;
      flex-shrink: 0;
    }

    .extras-question-badge-text {
      font-size: 20rpx;
      color: #b37a0a;
    }

    .extras-question-advice {
      font-size: 24rpx;
      color: #111111;
      line-height: 36rpx;
    }

    .extras-question-tags {
      display: flex;
      gap: 16rpx;
    }

    .extras-qtag {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4rpx;
      flex: 1;
      padding: 12rpx 16rpx;
      background: #ffffff;
      border: 2rpx solid #f0f0f0;
      border-radius: 16rpx;
      box-sizing: border-box;
    }

    .extras-qtag-label {
      font-size: 20rpx;
      color: #929292;
    }

    .extras-qtag-value {
      font-size: 24rpx;
      font-weight: 600;
      color: #111111;
      line-height: 36rpx;
      text-align: center;
    }

    // 折叠
    .extras-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .extras-toggle-arrow {
      font-size: 20rpx;
      color: #b37a0a;
      transition: transform 0.3s;

      &--up {
        transform: rotate(180deg);
      }
    }

    .extras-section-desc {
      font-size: 24rpx;
      color: #6b7280;
      line-height: 36rpx;
      display: block;
    }

    .extras-fengshui-samples {
      display: flex;
      flex-direction: column;
      gap: 20rpx;
    }

    // ----- 空间五建议：五行元素卡片 -----
    .fengshui-corner-card {
      border-radius: 24rpx;
      padding: 28rpx;
      display: flex;
      flex-direction: column;
      gap: 20rpx;
      overflow: hidden;
      position: relative;

      // 金
      &--metal {
        background: linear-gradient(180deg, #fffdf8, #fff8ec);
        border: 2rpx solid #f2e2bb;
      }
      // 木
      &--wood {
        background: linear-gradient(180deg, #fafff8, #f4fbf2);
        border: 2rpx solid #d9ead3;
      }
      // 火
      &--fire {
        background: linear-gradient(180deg, #fff8f6, #fff1ee);
        border: 2rpx solid #ffd9d0;
      }
      // 水
      &--water {
        background: linear-gradient(180deg, #f7fbff, #eff7ff);
        border: 2rpx solid #d7e8ff;
      }
      // 土
      &--earth {
        background: linear-gradient(180deg, #fffcf8, #faf5ee);
        border: 2rpx solid #ead9bf;
      }
    }

    .fengshui-corner-header {
      display: flex;
      align-items: center;
      gap: 16rpx;
    }

    // 元素图标
    .fengshui-corner-icon {
      width: 80rpx;
      height: 80rpx;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &--metal { background: #d4a73a; }
      &--wood { background: #7da56b; }
      &--fire { background: #e06a4a; }
      &--water { background: #5f95d3; }
      &--earth { background: #c7a16a; }
    }

    .fengshui-corner-icon-text {
      font-size: 36rpx;
      font-weight: 700;
      color: #fff;
    }

    .fengshui-corner-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6rpx;
    }

    .fengshui-corner-title {
      font-size: 28rpx;
      font-weight: 700;
      color: #111;
      line-height: 44rpx;
    }

    .fengshui-corner-badge {
      display: inline-flex;
      align-items: center;
      padding: 4rpx 12rpx;
      border-radius: 999rpx;
      align-self: flex-start;

      &--metal { background: #f9e9bf; color: #a87a13; }
      &--wood { background: #e4f2dd; color: #5a814b; }
      &--fire { background: #ffe0d8; color: #c95634; }
      &--water { background: #e3f0ff; color: #4a79b5; }
      &--earth { background: #f4e7d1; color: #a9824f; }
    }

    .fengshui-corner-badge-text {
      font-size: 20rpx;
      font-weight: 600;
      color: inherit;
    }

    .fengshui-corner-desc {
      font-size: 26rpx;
      color: #4b5563;
      line-height: 40rpx;
    }

    // 六格建议网格
    .fengshui-corner-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 14rpx;
    }

    .fengshui-grid-item {
      display: flex;
      flex-direction: column;
      width: calc((100% - 28rpx) / 3);
      min-height: 140rpx;
      padding: 18rpx 14rpx;
      background: #fff;
      border: 2rpx solid rgba(0, 0, 0, 0.06);
      border-radius: 18rpx;
      box-sizing: border-box;
      justify-content: flex-start;
    }

    .fengshui-grid-label {
      font-size: 22rpx;
      color: #9ca3af;
      margin-bottom: 12rpx;
    }

    .fengshui-grid-value {
      font-size: 26rpx;
      font-weight: 600;
      color: #111827;
      line-height: 40rpx;
      white-space: pre-line;
    }

    // ----- 免责声明 -----
    .disclaimer {
      width: 622rpx;
      margin: 32rpx auto 0;
      font-size: 24rpx;
      color: #a6a7ab;
      line-height: 36rpx;
    }
  }

  // ----- 错误状态 -----
  .error-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
  }

  .error-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20rpx;
    padding: 60rpx 40rpx;
  }

  .error-icon {
    font-size: 80rpx;
  }

  .error-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #1f2937;
    text-align: center;
  }

  .error-desc {
    font-size: 24rpx;
    color: #9ca3af;
  }

  // ----- 回到顶部 -----
  .back-top {
    position: fixed;
    right: 32rpx;
    bottom: 160rpx;
    width: 80rpx;
    height: 80rpx;
    background: #ffffff;
    border: 2rpx solid #f0f0f0;
    border-radius: 50%;
    box-shadow: 4rpx 4rpx 16rpx rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;

    &:active {
      background: #fef4da;
      border-color: rgba(179, 122, 10, 0.5);
    }
  }

  .back-top-arrow {
    font-size: 32rpx;
    color: #b37a0a;
  }
}

.placeholder {
  font-size: 28rpx;
  color: #9ca3af;
}

/* 错误提示 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40rpx;
  text-align: center;
}
.error-text {
  font-size: 32rpx;
  color: #ef4444;
  margin-bottom: 40rpx;
  line-height: 1.6;
}
.error-btn {
  padding: 20rpx 60rpx;
  background: #1f2937;
  color: #fff;
  border-radius: 12rpx;
  font-size: 28rpx;
}
</style>
