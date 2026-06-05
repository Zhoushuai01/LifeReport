/**
 * API 环境配置
 *
 * 启动命令对应的 env 文件会被 Vite 自动加载：
 *   npm run dev:h5       → .env.development  → VITE_API_ENV=local
 *   npm run dev:h5:test  → .env.test         → VITE_API_ENV=test
 *   npm run dev:h5:prod  → .env.production   → VITE_API_ENV=product
 *
 * 运行时可直接读 BASE_URL / ENV_HEADER。
 */

/** 当前生效的环境标识（来自 .env.* 的 VITE_API_ENV） */
export const ENV = import.meta.env.VITE_API_ENV || "local";

/** 所有环境配置 */
export const ENV_LIST = {
  local: {
    label: "本地环境",
    baseURL: "http://192.168.1.100:8080/yyfs-api",
    type: "local"
  },
  test: {
    label: "测试环境",
    baseURL: "https://staging.azoc.ai:8888/yyfs-api",
    type: "test"
  },
  product: {
    label: "生产环境",
    baseURL: "https://api.example.com/yyfs-api",
    type: "product"
  }
};

/** 当前环境完整配置 */
export const currentEnv = ENV_LIST[ENV] || ENV_LIST.local;

/** 接口统一请求根路径 */
export const BASE_URL = currentEnv.baseURL;

/** 全局请求头中携带的环境字段（X-Env） */
export const ENV_HEADER = currentEnv.type;

/** 请求超时（毫秒） */
export const REQUEST_TIMEOUT = 15000;

/** 业务签名密钥（仅用于 /open/biz/* 加签） */
export const SECRET_KEY = "openbiz-pay-secret";
