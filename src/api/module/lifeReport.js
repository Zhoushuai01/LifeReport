/**
 * 泛娱乐开放报告 — 报告生成
 * /open/biz/report/generate  POST  生成报告
 */
import { post } from "../request.js";

/**
 * 生成报告
 * @param {Object} data
 * @param {string} data.orderNo     系统订单号（必需）
 * @param {string} [data.solarDate] 出生日期（公历）YYYY-MM-DD
 * @param {string} [data.birthTime] 出生时间 HH:mm
 * @param {string} [data.gender]    男 | 女
 * @param {string} [data.city]      出生地省份/城市
 */
export function generateReport(data) {
  return post("/open/biz/report/generate", data);
}
