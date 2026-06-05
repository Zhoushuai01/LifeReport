/**
 * 统一请求封装
 * - 自动拼接 BASE_URL、注入 X-Env、超时
 * - 约定后端返回 { code, msg, data }，code !== 200/0 视为业务错误
 * - 业务错误会 reject 一个 ApiError，调用方可通过 isHandledError 识别
 */
import { BASE_URL, ENV_HEADER, REQUEST_TIMEOUT } from "./config.js";

export class ApiError extends Error {
  constructor(message, code, payload) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.payload = payload;
  }
}

export const isHandledError = (err) => err instanceof ApiError;

export const NETWORK_ERROR = {
  code: -1,
  message: "网络异常，请稍后重试"
};

function pickMessage(body, fallback) {
  if (!body) return fallback;
  return body.msg || body.message || fallback;
}

function isSuccessCode(code) {
  return code === 200 || code === 0 || code === undefined || code === null;
}

/**
 * 发起请求
 * @param {Object} options
 * @param {string} options.url
 * @param {"GET"|"POST"|"PUT"|"DELETE"} [options.method="GET"]
 * @param {Object} [options.data]  body / query 参数
 * @param {Object} [options.header]  自定义头
 * @param {number} [options.timeout]
 * @param {boolean} [options.hideErrorToast]  静默失败，不在控制台打印
 */
export function request(options) {
  const {
    url,
    method = "GET",
    data,
    header,
    timeout = REQUEST_TIMEOUT,
    hideErrorToast
  } = options;

  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method,
      data,
      header: {
        "Content-Type": "application/json",
        "X-Env": ENV_HEADER,
        ...header
      },
      timeout,
      success: (res) => {
        const status = res.statusCode;
        const body = res.data || {};
        if (status >= 200 && status < 300) {
          if (isSuccessCode(body.code)) {
            resolve(body);
          } else {
            const err = new ApiError(
              pickMessage(body, "业务异常"),
              body.code,
              body
            );
            if (!hideErrorToast) console.error("[API]", url, body);
            reject(err);
          }
        } else {
          const err = new ApiError(
            `HTTP ${status}`,
            status,
            body
          );
          if (!hideErrorToast) console.error("[API]", url, status, body);
          reject(err);
        }
      },
      fail: (err) => {
        const e = new ApiError(
          err.errMsg || NETWORK_ERROR.message,
          NETWORK_ERROR.code,
          err
        );
        if (!hideErrorToast) console.error("[API]", url, "fail:", err);
        reject(e);
      }
    });
  });
}

export const get = (url, params, options = {}) =>
  request({ url, method: "GET", data: params, ...options });

export const post = (url, data, options = {}) =>
  request({ url, method: "POST", data, ...options });
