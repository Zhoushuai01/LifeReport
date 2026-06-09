<template>
  <view class="life-report-page">
    <!-- 顶部装饰背景 -->
    <view class="top-bg-wrap">
      <image
        class="top-bg"
        src="/static/life-report/result-top.png"
        mode="aspectFill"
      />
    </view>

    <view class="page-body">
      <!-- 标题区 -->
      <view class="hero">
        <text class="hero-title">人生报告</text>
        <text class="hero-desc"
          >多维度解读你的人生轨迹，探索属于你的生命节奏</text
        >
      </view>

      <!-- 报告预览卡片 -->
      <view class="preview-card">
        <text class="preview-title">报告包含</text>
        <view class="preview-grid">
          <view class="preview-item">
            <image
              class="preview-icon"
              src="/static/life-report/date-icon.png"
              mode="aspectFit"
            />
            <view class="preview-text">
              <text class="preview-label">年度报告</text>
              <text class="preview-value">全年节奏与核心主题</text>
            </view>
          </view>
          <view class="preview-item">
            <image
              class="preview-icon"
              src="/static/life-report/book-icon.png"
              mode="aspectFit"
            />
            <view class="preview-text">
              <text class="preview-label">十年行旅</text>
              <text class="preview-value">长期阶段与生活主题</text>
            </view>
          </view>
          <view class="preview-item">
            <image
              class="preview-icon"
              src="/static/life-report/ring-icon.png"
              mode="aspectFit"
            />
            <view class="preview-text">
              <text class="preview-label">每月提醒</text>
              <text class="preview-value">12个月度旋律参考</text>
            </view>
          </view>
          <view class="preview-item">
            <image
              class="preview-icon"
              src="/static/life-report/position-icon.png"
              mode="aspectFit"
            />
            <view class="preview-text">
              <text class="preview-label">空间建议</text>
              <text class="preview-value">生活空间的轻量调适</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 查询已有报告入口 -->
      <view class="query-entry" @click="goQueryOrder">
        <text class="query-entry-text">查询已有报告</text>
        <text class="query-entry-arrow">›</text>
      </view>

      <!-- 表单卡片 -->
      <view class="form-card">
        <text class="form-title">出生信息</text>

        <view class="form-divider"></view>

        <!-- 表单字段 -->
        <view class="form-fields">
          <view class="form-group">
            <text class="label">姓名</text>
            <input
              class="input"
              v-model="form.name"
              type="text"
              placeholder="请输入姓名"
              placeholder-class="input-placeholder"
            />
          </view>

          <view class="form-group">
            <text class="label">出生日期</text>
            <picker mode="date" :value="form.solar_date" @change="onDateChange">
              <view class="picker-input">
                <text
                  class="picker-text"
                  :class="{ 'picker-text-placeholder': !form.solar_date }"
                >
                  {{ form.solar_date || "请选择公历生日" }}
                </text>
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>

          <view class="form-group">
            <text class="label">出生时间</text>
            <picker mode="time" :value="form.birth_time" @change="onTimeChange">
              <view class="picker-input">
                <text
                  class="picker-text"
                  :class="{ 'picker-text-placeholder': !form.birth_time }"
                >
                  {{ form.birth_time || "请选择出生时间" }}
                </text>
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>

          <view class="form-group">
            <text class="label">出生地</text>
            <picker
              mode="multiSelector"
              :range="pickerRange"
              :value="pickerValue"
              @change="onRegionChange"
              @columnchange="onRegionColumnChange"
            >
              <view class="picker-input">
                <text
                  class="picker-text"
                  :class="{ 'picker-text-placeholder': !form.birth_place }"
                >
                  {{ form.birth_place || "请选择出生地" }}
                </text>
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>

          <view class="form-group">
            <text class="label">性别</text>
            <view class="gender-row">
              <view
                class="gender-item"
                :class="{ 'gender-item-active': form.gender === '男' }"
                @click="form.gender = '男'"
              >
                <text class="gender-text">男</text>
              </view>
              <view
                class="gender-item"
                :class="{ 'gender-item-active': form.gender === '女' }"
                @click="form.gender = '女'"
              >
                <text class="gender-text">女</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 提交按钮 -->
        <view
          class="submit-btn"
          :class="{ 'submit-btn-disabled': loading }"
          @click="onSubmit"
        >
          <template v-if="priceLoading">
            <view class="submit-spinner"></view>
            <text class="submit-btn-text">加载中</text>
          </template>
          <template v-else>
            <text class="submit-currency">¥</text>
            <text class="submit-price">{{ price }}</text>
            <text class="submit-btn-text">立即解锁</text>
          </template>
        </view>
      </view>
    </view>

    <!-- 验证码弹窗 -->
    <view v-if="captchaVisible" class="captcha-mask" @click.self="closeCaptcha">
      <view class="captcha-modal">
        <view class="captcha-title">安全验证</view>
        <view class="captcha-desc">请输入下图中的验证码，完成下单</view>

        <view class="captcha-row">
          <input
            class="captcha-input"
            v-model="captchaCode"
            type="text"
            placeholder="请输入验证码"
            placeholder-class="captcha-input-placeholder"
            maxlength="6"
          />
          <view class="captcha-img-wrap" @click="refreshCaptcha">
            <image
              v-if="captchaImg"
              class="captcha-img"
              :src="captchaImg"
              mode="aspectFit"
            />
            <view v-else class="captcha-img-placeholder">点击刷新</view>
            <view v-if="captchaLoading" class="captcha-img-loading"
              >加载中</view
            >
          </view>
        </view>

        <view class="captcha-actions">
          <view class="captcha-btn captcha-btn-cancel" @click="closeCaptcha"
            >取消</view
          >
          <view
            class="captcha-btn captcha-btn-confirm"
            :class="{ 'captcha-btn-disabled': loading || !captchaCode }"
            @click="onConfirmPay"
          >
            <view v-if="loading" class="captcha-btn-spinner"></view>
            <text v-else>去支付</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import {
  getPayOrderPrice,
  createPayOrder,
  getPayStatus,
} from "@/api/module/pay.js";
import { generateReport, getRegions } from "@/api/module/lifeReport.js";
import { getCaptchaImage } from "@/api/module/captcha.js";
import { isHandledError } from "@/api/request.js";

const PRODUCT_ID = "newlifedepthreport";

const form = reactive({
  name: "",
  solar_date: "",
  birth_time: "",
  gender: "",
  birth_place: "",
});

const loading = ref(false);
const price = ref("9.9");
const priceLoading = ref(true);

// 验证码弹窗
const captchaVisible = ref(false);
const captchaImg = ref("");
const captchaUuid = ref("");
const captchaCode = ref("");
const captchaLoading = ref(false);

// 地区选择器
const regionList = ref([]); // 原始数据 [{country, province[]}]
const pickerRange = ref([[], []]); // 两列：国家列表、当前国家的省份列表
const pickerValue = ref([0, 0]); // 当前选中索引 [countryIdx, provinceIdx]
const selectedProvince = ref(""); // 最终选中的省份名称（作为 city 传入）

const goQueryOrder = () => {
  uni.navigateTo({ url: "/pages/life-report/query" });
};

// 支付订单
let currentOrderNo = "";
let payPollTimer = null;
let payWindow = null;

const onDateChange = (e) => {
  form.solar_date = e.detail.value;
};

const onTimeChange = (e) => {
  form.birth_time = e.detail.value;
};

// 拉取价格
const fetchPrice = async () => {
  priceLoading.value = true;
  try {
    const res = await getPayOrderPrice({ productId: PRODUCT_ID });
    if (res?.code === 200) {
      price.value = res.data?.price ?? price.value;
    }
  } catch (e) {
    if (!isHandledError(e)) console.error("价格查询失败", e);
  } finally {
    priceLoading.value = false;
  }
};

// 拉取地区数据
const fetchRegions = async () => {
  try {
    const res = await getRegions();
    if (res?.code === 200 && res.data && typeof res.data === "object") {
      // data 是对象：{ "中国大陆": { locations: { "北京市": {...} } }, ... }
      const entries = Object.entries(res.data);
      regionList.value = entries.map(([country, info]) => ({
        country,
        provinces: Object.keys(info.locations || {}),
      }));
      if (regionList.value.length > 0) {
        pickerRange.value = [
          regionList.value.map((item) => item.country),
          regionList.value[0].provinces,
        ];
      }
    }
  } catch (e) {
    if (!isHandledError(e)) console.error("地区数据加载失败", e);
  }
};

// 地区选择器 — 列变化（第一列切换国家时，第二列省份联动）
const onRegionColumnChange = (e) => {
  const { column, value } = e.detail;
  if (column === 0 && regionList.value[value]) {
    pickerRange.value[1] = regionList.value[value].provinces || [];
    pickerValue.value[1] = 0;
  }
};

// 地区选择器 — 确认选择
const onRegionChange = (e) => {
  const [cIdx, pIdx] = e.detail.value;
  pickerValue.value = [cIdx, pIdx];
  if (regionList.value[cIdx]) {
    const country = regionList.value[cIdx].country;
    const province = regionList.value[cIdx].provinces?.[pIdx] || "";
    selectedProvince.value = province;
    form.birth_place = province ? `${country} ${province}` : country;
  }
};

// 把后端返回的 base64 加上 data URI 前缀
const toDataUri = (raw) => {
  if (!raw) return "";
  if (typeof raw !== "string") return "";
  if (raw.startsWith("data:image/")) return raw;
  // 通过 base64 头几位自动识别 png / jpeg / gif，识别不出默认 jpeg
  let mime = "image/jpeg";
  if (raw.startsWith("iVBORw")) mime = "image/png";
  else if (raw.startsWith("R0lGOD")) mime = "image/gif";
  else if (raw.startsWith("/9j/")) mime = "image/jpeg";
  return `data:${mime};base64,${raw}`;
};

/**
 * uniapp 标准方式打开外部链接
 * - 优先 plus.runtime.openURL（APP / H5-WebView 通用）
 * - 兜底 window.open
 */
const openExternalUrl = (url) => {
  if (!url) return Promise.reject(new Error("url is empty"));

  return new Promise((resolve) => {
    if (typeof plus !== "undefined" && plus.runtime && plus.runtime.openURL) {
      plus.runtime.openURL(url, (err) => {
        if (err) {
          console.error("[pay] openURL fail", err);
          uni.showToast({ title: "打开支付页失败", icon: "none" });
          resolve(false);
        } else {
          resolve(true);
        }
      });
      return;
    }

    // #ifdef H5
    const w = window.open(url, "_blank", "noopener");
    if (!w) {
      uni.showModal({
        title: "支付提示",
        content: "浏览器拦截了支付弹窗，是否在当前页打开？",
        success: (r) => {
          if (r.confirm) {
            window.location.href = url;
            resolve(true);
          } else {
            resolve(false);
          }
        },
      });
    } else {
      resolve(true);
    }
    // #endif

    // #ifndef H5
    uni.setClipboardData({
      data: url,
      success: () => {
        uni.showToast({ title: "请在浏览器粘贴打开", icon: "none" });
        resolve(false);
      },
      fail: () => resolve(false),
    });
    // #endif
  });
};

/**
 * 触发支付宝 form 表单跳转
 * 后端 payUrl 是完整 HTML：
 *   <form action="https://open.alipay.com/..." method="post">
 *     <input name="..." value="...">
 *     <scr\ipt>document.forms[0].submit()<\/scr\ipt>
 *   </form>
 *
 * 策略：
 * 1. 优先用 window.open 打开新窗口，把 HTML 写进去 — form 内的脚本自动 submit 跳到支付宝
 * 2. 弹窗被拦截时解析 form，提取 action + 隐藏域，在当前窗口内建一个 form 直接 POST 提交
 */
const triggerAlipayForm = (html) => {
  if (!html || typeof html !== "string") return false;

  // #ifdef H5
  // ---------- 策略 1：新窗口写入 HTML ----------
  //   const w = window.open("", "_blank", "noopener");
  //   if (w) {
  //     w.document.write(html);
  //     w.document.close();
  //     return w; // 返回窗口引用，用于支付成功后关闭
  //   }

  // ---------- 策略 2：弹窗被拦截，在主页 document 中构造 form POST ----------
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");
  const originalForm = parsed.querySelector("form");
  if (!originalForm) return false;

  const form = document.createElement("form");
  form.method = originalForm.getAttribute("method") || "post";
  form.action = originalForm.getAttribute("action") || "";
  form.acceptCharset = originalForm.getAttribute("accept-charset") || "utf-8";
  form.style.display = "none";

  const inputs = originalForm.querySelectorAll("input");
  for (const inp of inputs) {
    const el = document.createElement("input");
    el.type = "hidden";
    el.name = inp.getAttribute("name") || "";
    el.value = inp.getAttribute("value") || "";
    form.appendChild(el);
  }

  document.body.appendChild(form);
  form.submit();
  return true;
  // #endif

  // #ifndef H5
  return false;
  // #endif
};

// 刷新验证码
const refreshCaptcha = async () => {
  captchaLoading.value = true;
  try {
    const res = await getCaptchaImage();
    const payload = res?.data ?? res;
    if (payload?.uuid) {
      captchaUuid.value = payload.uuid || "";
      captchaImg.value = toDataUri(payload.img || "");
    }
  } catch (e) {
    uni.showToast({ title: "验证码加载失败", icon: "none" });
  } finally {
    captchaLoading.value = false;
  }
};

// 验证表单
const validateForm = () => {
  if (!form.name) return "请输入姓名";
  if (!form.solar_date) return "请选择出生日期";
  if (!form.birth_time) return "请选择出生时间";
  if (!form.birth_place) return "请输入出生地";
  if (!form.gender) return "请选择性别";
  return null;
};

// 主按钮点击
const onSubmit = async () => {
  const err = validateForm();
  if (err) return uni.showToast({ title: err, icon: "none" });
  if (loading.value) return;
  captchaCode.value = "";
  captchaVisible.value = true;
  await refreshCaptcha();
};

// 关闭验证码弹窗
const closeCaptcha = () => {
  captchaVisible.value = false;
  captchaCode.value = "";
};

// 去支付
const onConfirmPay = async () => {
  if (!captchaCode.value) {
    return uni.showToast({ title: "请输入验证码", icon: "none" });
  }
  if (!captchaUuid.value) {
    return uni.showToast({ title: "验证码未就绪，请刷新", icon: "none" });
  }

  loading.value = true;
  try {
    // 构造支付成功后的回跳地址（H5 端，带上用户信息让结果页展示）
    // #ifdef H5
    const params = new URLSearchParams({
      name: form.name,
      solar_date: form.solar_date,
      birth_time: form.birth_time,
      gender: form.gender,
      birth_place: form.birth_place,
    });
    const returnUrl =
      window.location.href.replace(/\/index$/, "/result") +
      "?" +
      params.toString();
    // #endif
    // 检测是否为手机端，决定使用 H5 还是 PC 支付
    // #ifdef H5
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const tradeType = isMobile ? "H5" : "PC";
    // #endif
    // #ifndef H5
    const tradeType = "H5";
    // #endif
    const createRes = await createPayOrder({
      payChannel: "ALIPAY",
      tradeType: tradeType,
      productId: PRODUCT_ID,
      code: captchaCode.value,
      uuid: captchaUuid.value,
      // #ifdef H5
      returnUrl,
      // #endif
    });
    if (createRes?.code !== 200) {
      uni.showToast({ title: createRes?.msg || "创建订单失败", icon: "none" });
      refreshCaptcha();
      return;
    }

    currentOrderNo = createRes.data?.orderNo || "";
    const payUrlRaw = createRes.data?.payUrl;

    // 保存订单号到 localStorage，供 result.vue 回跳后读取
    if (currentOrderNo) {
      try {
        localStorage.setItem("report_order_no", currentOrderNo);
      } catch (_) {
        /* ignore */
      }
    }

    if (!currentOrderNo) {
      uni.showToast({ title: "未获取到订单号", icon: "none" });
      return;
    }

    captchaVisible.value = false;

    if (payUrlRaw) {
      // 触发支付宝 form 表单跳转（新窗口 / 当前页 POST 两种策略）
      const result = triggerAlipayForm(payUrlRaw);
      if (result) {
        // 如果返回的是 window 引用，保存下来以便支付成功后关闭
        if (result !== true && typeof result.close === "function") {
          payWindow = result;
        }
        uni.showToast({
          title: "请在新窗口完成支付",
          icon: "none",
          duration: 2000,
        });
        // 启动轮询（用户支付完成会从轮询里捕获到已支付）
        startPayPolling();
      } else {
        // 非 H5 端兜底：用 plus.runtime.openURL 直接传 form HTML（部分容器支持）
        openExternalUrl(payUrlRaw);
        startPayPolling();
      }
    } else {
      // 无 payUrl：直接进入轮询（适用于扫码/同步回调场景）
      startPayPolling();
    }
  } catch (e) {
    if (!isHandledError(e)) console.error("下单失败", e);
    uni.showToast({ title: e?.message || "下单失败", icon: "none" });
    refreshCaptcha();
  } finally {
    loading.value = false;
  }
};

// 轮询支付状态
const startPayPolling = () => {
  clearPayPolling();
  if (!currentOrderNo) return;
  uni.showLoading({ title: "正在确认支付结果..." });
  let attempt = 0;
  const tick = async () => {
    attempt += 1;
    try {
      const res = await getPayStatus({ orderNo: currentOrderNo });
      const status = String(res?.data?.status ?? res?.status ?? "");
      // status: 0=待支付 1=已支付 2=已关闭 3=已退款
      if (status === "1" || status === "PAID" || status === "SUCCESS") {
        uni.hideLoading();
        clearPayPolling();
        onPaySuccess();
        return;
      }
      if (
        status === "2" ||
        status === "3" ||
        status === "CLOSED" ||
        status === "REFUNDED"
      ) {
        uni.hideLoading();
        clearPayPolling();
        uni.showToast({ title: "订单已关闭", icon: "none" });
        return;
      }
      if (attempt >= 60) {
        uni.hideLoading();
        clearPayPolling();
        uni.showToast({ title: "支付确认超时", icon: "none" });
        return;
      }
      payPollTimer = setTimeout(tick, 2000);
    } catch (e) {
      uni.hideLoading();
      clearPayPolling();
      if (!isHandledError(e)) console.error("支付状态查询失败", e);
    }
  };
  payPollTimer = setTimeout(tick, 1000);
};

const clearPayPolling = () => {
  if (payPollTimer) {
    clearTimeout(payPollTimer);
    payPollTimer = null;
  }
};

// 支付成功 → 生成报告
const onPaySuccess = async () => {
  // 关掉支付窗口
  if (payWindow && !payWindow.closed) {
    try {
      payWindow.close();
    } catch (_) {
      /* ignore */
    }
  }
  payWindow = null;

  uni.showLoading({ title: "正在生成报告..." });
  try {
    const city = selectedProvince.value || form.birth_place || "";
    const genRes = await generateReport({
      orderNo: currentOrderNo,
      solarDate: form.solar_date,
      birthTime: form.birth_time,
      gender: form.gender,
      city,
    });
    uni.hideLoading();
    if (genRes?.code !== 200) {
      uni.showToast({ title: genRes?.msg || "生成失败", icon: "none" });
      return;
    }
    // 成功后跳转结果页
    const params = {
      name: encodeURIComponent(form.name),
      solar_date: encodeURIComponent(form.solar_date),
      birth_time: encodeURIComponent(form.birth_time),
      gender: encodeURIComponent(form.gender),
      birth_place: encodeURIComponent(form.birth_place),
      order_no: encodeURIComponent(currentOrderNo),
    };
    const qs = Object.keys(params)
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    uni.navigateTo({ url: `/pages/life-report/result?${qs}` });
  } catch (e) {
    uni.hideLoading();
    if (!isHandledError(e)) console.error("生成报告失败", e);
    uni.showToast({ title: e?.message || "生成失败", icon: "none" });
  }
};

onShow(() => {
  fetchPrice();
  fetchRegions();
});

onUnmounted(() => {
  clearPayPolling();
});
</script>

<style>
.life-report-page {
  min-height: 100vh;
  background: #f7f7f3;
  box-sizing: border-box;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.top-bg-wrap {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 460rpx;
  overflow: hidden;
  z-index: 0;
}

.top-bg {
  width: 100%;
  height: 100%;
}

.page-body {
  margin-top: 40rpx;
  padding: 0 32rpx 40rpx;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 2;
}

/* ===== 标题 ===== */
.hero {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 40rpx 0 0;
}

.hero-title {
  font-size: 56rpx;
  font-weight: 700;
  color: #111111;
  letter-spacing: 4rpx;
  line-height: 1.2;
}

.hero-desc {
  font-size: 26rpx;
  color: #1f2937;
  line-height: 40rpx;
  width: 460rpx;
  opacity: 0.9;
}

/* ===== 预览卡 ===== */
.preview-card {
  width: 100%;
  margin: 32rpx 0 0;
  background: #ffffff;
  border-radius: 32rpx;
  box-shadow: 4rpx 4rpx 20rpx rgba(69, 30, 2, 0.04);
  padding: 32rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.preview-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #000000;
  margin-bottom: 24rpx;
}

.preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx 22rpx;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  width: calc((100% - 22rpx) / 2);
  height: 112rpx;
  padding: 16rpx;
  background: #ffffff;
  border: 2rpx solid #f0f0f0;
  border-radius: 16rpx;
  box-sizing: border-box;
  flex-shrink: 0;
}

.preview-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
}

.preview-text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  flex: 1;
  min-width: 0;
}

.preview-label {
  font-size: 20rpx;
  color: #000000;
  line-height: 32rpx;
}

.preview-value {
  font-size: 24rpx;
  color: #000000;
  font-weight: 600;
  line-height: 36rpx;
}

/* ===== 查询入口 ===== */
.query-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 24rpx 0 0;
}

.query-entry-text {
  font-size: 26rpx;
  color: #b37a0a;
  font-weight: 500;
}

.query-entry-arrow {
  font-size: 28rpx;
  color: #b37a0a;
}

/* ===== 表单卡 ===== */
.form-card {
  width: 100%;
  margin: 24rpx 0 0;
  background: #ffffff;
  border-radius: 32rpx;
  box-shadow: 4rpx 4rpx 20rpx rgba(69, 30, 2, 0.04);
  padding: 32rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.form-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #000000;
  margin-bottom: 24rpx;
}

/* ===== 表单字段 ===== */
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 24rpx;
}

.label {
  font-size: 28rpx;
  font-weight: 600;
  color: #111111;
}

.input {
  height: 88rpx;
  border-radius: 16rpx;
  background: #f7f7f7;
  padding: 0 24rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #111111;
  display: flex;
  align-items: center;
}

.input-placeholder {
  color: #c0c0c0;
}

.picker-input {
  height: 88rpx;
  border-radius: 16rpx;
  background: #f7f7f7;
  padding: 0 24rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #111111;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-text {
  color: #111111;
}

.picker-text-placeholder {
  color: #c0c0c0;
}

.picker-arrow {
  font-size: 24rpx;
  color: #929292;
  transform: rotate(90deg);
}

/* ===== 性别选择 ===== */
.gender-row {
  display: flex;
  gap: 16rpx;
}

.gender-item {
  flex: 1;
  height: 88rpx;
  border-radius: 16rpx;
  background: #f7f7f7;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}

.gender-item-active {
  background: #fff8e7;
  border-color: #b37a0a;
}

.gender-text {
  font-size: 28rpx;
  color: #111111;
  font-weight: 500;
}

.gender-item-active .gender-text {
  color: #b37a0a;
  font-weight: 700;
}

/* ===== 提交按钮 ===== */
.submit-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 999rpx;
  margin: 40rpx 0 0;
  background: linear-gradient(
    135deg,
    #d4a853 0%,
    #c4963f 30%,
    #b37a0a 70%,
    #9a6b08 100%
  );
  box-shadow: 0 8rpx 24rpx rgba(179, 122, 10, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  transition: all 0.2s;
}

.submit-btn:active {
  opacity: 0.9;
  transform: scale(0.98);
}

.submit-btn-disabled {
  opacity: 0.5;
}

.submit-currency {
  font-size: 24rpx;
  font-weight: 700;
  color: #ffffff;
}

.submit-price {
  font-size: 40rpx;
  font-weight: 800;
  color: #ffffff;
  line-height: 1;
}

.submit-btn-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 4rpx;
}

/* ===== 提交按钮 loading ===== */
.submit-spinner {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  animation: submit-spin 0.75s linear infinite;
}

@keyframes submit-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ===== 验证码弹窗 ===== */
.captcha-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 32rpx;
  box-sizing: border-box;
}

.captcha-modal {
  width: 100%;
  max-width: 600rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  box-sizing: border-box;
  animation: captcha-pop 0.2s ease;
}

@keyframes captcha-pop {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.captcha-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #111111;
  text-align: center;
}

.captcha-desc {
  font-size: 24rpx;
  color: #6b7280;
  text-align: center;
  line-height: 36rpx;
}

.captcha-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.captcha-input {
  flex: 1;
  height: 80rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #111111;
  box-sizing: border-box;
  background: #f9fafb;
}

.captcha-input-placeholder {
  color: #9ca3af;
  font-size: 26rpx;
}

.captcha-img-wrap {
  position: relative;
  width: 200rpx;
  height: 80rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.captcha-img {
  width: 100%;
  height: 100%;
}

.captcha-img-placeholder {
  font-size: 22rpx;
  color: #9ca3af;
}

.captcha-img-loading {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: #6b7280;
}

.captcha-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 8rpx;
}

.captcha-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
  transition: all 0.2s;
}

.captcha-btn:active {
  opacity: 0.85;
  transform: scale(0.98);
}

.captcha-btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.captcha-btn-confirm {
  background: linear-gradient(135deg, #d4a853 0%, #b37a0a 100%);
  color: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(179, 122, 10, 0.25);
}

.captcha-btn-disabled {
  opacity: 0.5;
}

.captcha-btn-spinner {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  animation: submit-spin 0.75s linear infinite;
}
</style>
