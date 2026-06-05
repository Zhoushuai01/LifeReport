/**
 * 泛娱乐开放报告 — 支付相关
 * /open/biz/report/price         GET  查询价格
 * /open/biz/report/pay/create    POST 创建支付订单
 * /open/biz/report/pay/status    GET  查询支付状态
 */
import { get, post } from "../request.js";

/**
 * 查询价格
 * @param {Object} params
 * @param {string} params.productId  产品ID（如 newlifedepthreport）
 * @returns {Promise<{code,msg,data:{price:string,originalPrice?:string,productId?:string}}>}
 */
export function getPayOrderPrice(params) {
  return get("/open/biz/report/price", params);
}

/**
 * 创建支付订单
 * @param {Object} data
 * @param {string} data.payChannel   ALIPAY
 * @param {string} data.tradeType    PC | H5
 * @param {string} [data.returnUrl]  支付完成回跳地址
 * @param {string} data.productId
 * @param {string} data.code         图形验证码内容
 * @param {string} data.uuid         /captchaImage 返回的 uuid
 * @returns {Promise<{code,msg,data:{orderNo:string,payUrl?:string}}>}
 */
export function createPayOrder(data) {
  return post("/open/biz/report/pay/create", data);
}

/**
 * 查询支付状态
 * @param {Object} params
 * @param {string} params.orderNo  系统订单号
 */
export function getPayStatus(params) {
  return get("/open/biz/report/pay/status", params);
}
