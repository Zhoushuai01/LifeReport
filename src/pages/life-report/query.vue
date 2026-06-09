<template>
  <view class="query-page">
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
        <text class="hero-title">查询已有报告</text>
      </view>

      <!-- 查询表单卡片 -->
      <view class="form-card">
        <text class="form-title">订单信息</text>
        <view class="form-divider"></view>

        <view class="form-group">
          <text class="label">订单号</text>
          <input
            class="input"
            v-model="orderNo"
            type="text"
            placeholder="请输入订单号"
            placeholder-class="input-placeholder"
          />
        </view>

        <text class="example-link" @click="onPreviewExample">查看示例</text>

        <view
          class="submit-btn"
          :class="{ 'submit-btn-disabled': loading || !orderNo.trim() }"
          @click="onQuery"
        >
          <view v-if="loading" class="submit-spinner"></view>
          <text class="submit-btn-text">查询</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from "vue";
import { getPayStatus } from "@/api/module/pay.js";

const orderNo = ref("");
const loading = ref(false);

const onPreviewExample = () => {
  uni.previewImage({
    urls: ["/static/life-report/orderNoImage.jpg"],
  });
};

const onQuery = async () => {
  const no = orderNo.value.trim();
  if (!no || loading.value) return;

  loading.value = true;
  try {
    const res = await getPayStatus({ orderNo: no });
    if (res?.code === 200) {
      uni.navigateTo({ url: `/pages/life-report/result?orderNo=${no}&mode=query` });
    } else {
      uni.showToast({ title: "未找到该订单，请检查订单号", icon: "none" });
    }
  } catch (e) {
    uni.showToast({ title: "网络异常，请稍后重试", icon: "none" });
  } finally {
    loading.value = false;
  }
};
</script>

<style>
.query-page {
  min-height: 100vh;
  background: #f7f7f3;
  display: flex;
  flex-direction: column;
}

.top-bg-wrap {
  width: 100%;
  height: 460rpx;
  position: relative;
  overflow: hidden;
}

.top-bg {
  width: 100%;
  height: 100%;
}

.page-body {
  flex: 1;
  padding: 0 32rpx 40rpx;
  margin-top: -230rpx;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
}

/* ===== 标题 ===== */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 0 24rpx;
  gap: 12rpx;
}

.hero-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #111111;
  letter-spacing: 2rpx;
}

.hero-desc {
  font-size: 26rpx;
  color: #888888;
  line-height: 38rpx;
}

/* ===== 表单卡片 ===== */
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

.form-divider {
  width: 100%;
  height: 1rpx;
  background: #f0f0f0;
  margin-bottom: 24rpx;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
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
  font-size: 28rpx;
  color: #bfbfbf;
}

.example-link {
  font-size: 26rpx;
  color: #b37a0a;
  font-weight: 500;
  margin-top: 20rpx;
  align-self: flex-start;
}

/* ===== 提交按钮 ===== */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin-top: 32rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background: linear-gradient(
    135deg,
    #d4a853 0%,
    #c4963f 30%,
    #b37a0a 70%,
    #9a6b08 100%
  );
  box-shadow: 0 6rpx 18rpx rgba(179, 122, 10, 0.32);
}

.submit-btn:active {
  opacity: 0.85;
  transform: scale(0.98);
}

.submit-btn-disabled {
  opacity: 0.55;
  pointer-events: none;
}

.submit-btn-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
}

.submit-spinner {
  width: 32rpx;
  height: 32rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: submit-spin 0.7s linear infinite;
}

@keyframes submit-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
