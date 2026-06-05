<template>
  <view class="page">
    <!-- 主卡：人生报告 -->
    <view class="hero-card">
      <image
        class="hero-bg"
        src="/static/feature/life-report.png"
        mode="aspectFill"
      />

      <!-- 右上角价格徽标 -->
      <view class="price-badge">
        <text class="price-badge-text">
          <template v-if="priceLoading">加载中…</template>
          <template v-else-if="price">¥{{ price }}解锁</template>
          <template v-else>¥9.9解锁</template>
        </text>
      </view>

      <!-- 文案 + 按钮 浮层 -->
      <view class="hero-overlay">
        <view class="hero-text">
          <text class="hero-title">人生报告</text>
          <text class="hero-subtitle">洞察人生</text>
          <text class="hero-desc">多维度解读你的人生轨迹</text>
        </view>

        <view class="hero-action">
          <view class="explore-btn" @click="goLifeReport">
            <text class="explore-btn-text">立即探索</text>
            <text class="explore-btn-arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 历史记录入口 -->
    <view class="history-entry">
      <text class="history-entry-text">查看历史记录</text>
      <text class="history-entry-arrow">›</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getPayOrderPrice } from "@/api/module/pay.js";
import { isHandledError } from "@/api/request.js";

const PRODUCT_ID = "newlifedepthreport";
const price = ref("");
const priceLoading = ref(true);

const fetchPrice = async () => {
  priceLoading.value = true;
  try {
    const res = await getPayOrderPrice({ productId: PRODUCT_ID });
    if (res?.code === 200) {
      price.value = res.data?.price ?? "";
    }
  } catch (e) {
    if (!isHandledError(e)) console.error("价格查询失败", e);
  } finally {
    priceLoading.value = false;
  }
};

const goLifeReport = () => {
  uni.navigateTo({ url: "/pages/life-report/index" });
};

onShow(() => {
  fetchPrice();
});
</script>

<style>
.page {
  min-height: 100vh;
  background: #f7f7f3;
  box-sizing: border-box;
  padding: 24rpx 0 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ===== 主卡 ===== */
.hero-card {
  position: relative;
  width: 686rpx;
  height: 420rpx;
  border-radius: 32rpx;
  overflow: hidden;
  background: #fef4da;
  box-shadow: 4rpx 8rpx 24rpx rgba(69, 30, 2, 0.08);
  display: flex;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* 浮层内容 */
.hero-overlay {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  padding: 40rpx 40rpx 36rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  z-index: 2;
}

.hero-text {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.hero-title {
  font-size: 56rpx;
  font-weight: 700;
  color: #000000;
  letter-spacing: 4rpx;
  line-height: 1.1;
}

.hero-subtitle {
  font-size: 30rpx;
  font-weight: 600;
  color: #111111;
  margin-top: 8rpx;
}

.hero-desc {
  font-size: 24rpx;
  color: #111111;
  margin-top: 6rpx;
  line-height: 36rpx;
  opacity: 0.85;
}

.hero-action {
  display: flex;
  align-items: center;
}

.explore-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #d4a853 0%, #c4963f 30%, #b37a0a 70%, #9a6b08 100%);
  box-shadow: 0 6rpx 18rpx rgba(179, 122, 10, 0.32);
}

.explore-btn-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
}

.explore-btn-arrow {
  font-size: 30rpx;
  color: #ffffff;
  font-weight: 600;
  line-height: 1;
}

/* 右上角价格徽标 */
.price-badge {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  z-index: 3;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #d4a853 0%, #b37a0a 100%);
  box-shadow: 0 4rpx 12rpx rgba(179, 122, 10, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
}

.price-badge-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1rpx;
}

/* ===== 历史记录 ===== */
.history-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 32rpx 0 0;
}

.history-entry-text {
  font-size: 26rpx;
  color: #b37a0a;
  font-weight: 500;
}

.history-entry-arrow {
  font-size: 28rpx;
  color: #b37a0a;
}
</style>
