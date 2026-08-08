<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { useThemeStore } from "@/stores/theme";

onLaunch(() => {
  console.log("App Launch");

  // AI_Project storage init
  const s = uni as any;
  if (typeof s.getStorageSync("awakeningCoins") !== "number") s.setStorageSync("awakeningCoins", 10);
  if (typeof s.getStorageSync("hasSeenOnboarding") !== "boolean") s.setStorageSync("hasSeenOnboarding", false);
  if (typeof s.getStorageSync("streakDays") !== "number") s.setStorageSync("streakDays", 0);
  if (typeof s.getStorageSync("lastCheckInDate") !== "string") s.setStorageSync("lastCheckInDate", "");

  // Initialize global theme
  const themeStore = useThemeStore();
  themeStore.init();

});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>

<style>
/* 此刻 · Being — 全局深色风格 */
page {
  background: #2A231D;
  color: #FDFBF7;
  font-family: -apple-system, "PingFang SC", "SF Pro Text", "Helvetica Neue", sans-serif;
  font-size: 28rpx;
  line-height: 1.6;
  /* Global theme variables — overridden by themeStore.applyGlobally() */
  --theme-accent: #C49A6C;
  --theme-accent-light: rgba(196, 154, 108, 0.15);
  --theme-card-bg: #3E342B;
}

/* 衬线标题 */
.serif {
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-weight: 600;
}

/* 通用按钮 — 各页面可覆盖 */
.btn {
  display: flex; align-items: center; justify-content: center;
  border-radius: 40rpx; border: none;
  font-weight: 500;
  transition: transform 0.2s;
  box-sizing: border-box;
}
.btn:active { transform: scale(0.96); }

/* 动画 */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20rpx); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes bounceIn {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

.fade-up { animation: fadeUp 0.5s ease both; }
.fade-up-d1 { animation: fadeUp 0.5s ease 0.08s both; }
.fade-up-d2 { animation: fadeUp 0.5s ease 0.14s both; }
.fade-up-d3 { animation: fadeUp 0.5s ease 0.2s both; }
</style>
