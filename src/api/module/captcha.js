/**
 * 图形验证码
 * GET /captchaImage
 * 返回 { uuid, img (base64) }
 */
import { get } from "../request.js";

export function getCaptchaImage() {
  return get("/captchaImage");
}
