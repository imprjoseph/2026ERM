import test from "node:test";
import assert from "node:assert/strict";
import { canTransition, csvSafe, validateRegistration } from "../lib/validation";

const valid = {
  nameZh:"測試者", nameEn:"Test User", organization:"示意機構", department:"風險管理部",
  jobTitle:"經理", category:"壽險業", mobile:"0912345678", email:"qa@example.invalid",
  needsEnglishBadge:true, dietary:"一般", dietaryNotes:"", accessibilityNeeds:"", notes:"",
  acceptsUpdates:true, privacyConsent:true, companyWebsite:"", formStartedAt:1,
};

test("有效報名資料通過伺服器驗證",()=>{const result=validateRegistration(valid,10_000);assert.equal(result.valid,true);assert.equal(result.data.email,"qa@example.invalid")});
test("Email 格式錯誤會被拒絕",()=>{const result=validateRegistration({...valid,email:"invalid"},10_000);assert.equal(result.valid,false);assert.match(result.errors.email,/有效/) });
test("手機格式錯誤會被拒絕",()=>{const result=validateRegistration({...valid,mobile:"123"},10_000);assert.equal(result.valid,false);assert.match(result.errors.mobile,/有效/) });
test("個資同意不得省略",()=>{const result=validateRegistration({...valid,privacyConsent:false},10_000);assert.equal(result.valid,false);assert.ok(result.errors.privacyConsent) });
test("蜜罐欄位可阻擋垃圾報名",()=>{const result=validateRegistration({...valid,companyWebsite:"spam.example"},10_000);assert.equal(result.valid,false);assert.ok(result.errors.form) });
test("過快送出的表單會被阻擋",()=>{const result=validateRegistration({...valid,formStartedAt:9_000},10_000);assert.equal(result.valid,false);assert.ok(result.errors.form) });
test("審核狀態只允許定義內的轉換",()=>{assert.equal(canTransition("pending_review","approved"),true);assert.equal(canTransition("rejected","approved"),false);assert.equal(canTransition("checked_in","approved"),true) });
test("CSV 匯出防止公式注入",()=>{assert.equal(csvSafe("=HYPERLINK(\"x\")"),'"\'=HYPERLINK(""x"")"');assert.equal(csvSafe("一般文字"),'"一般文字"') });
