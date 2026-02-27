// ============================================================
// Code.gs
// メインルーター & GAS エントリーポイント
// ============================================================

/**
 * GAS Web App エントリーポイント
 * ?page=customer → お客様表示
 * ?page=staff    → スタッフ管理
 * （省略時はお客様表示）
 */
function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'customer';

  var template;
  if (page === 'staff') {
    template = HtmlService.createTemplateFromFile('Staff');
  } else {
    template = HtmlService.createTemplateFromFile('Customer');
  }

  return template.evaluate()
    .setTitle('飲食店管理システム')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * HTMLインクルード用（CSS/JS共通パーツ）
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================
// クライアント側から呼ぶAPI（google.script.run経由）
// ============================================================

/** [顧客・スタッフ共通] 営業状況取得 */
function apiGetBusinessStatus() {
  return JSON.stringify(getBusinessStatus());
}

/** [顧客] メニュー取得（営業時間外は非表示） */
function apiGetMenu() {
  return JSON.stringify(getMenu());
}

/** [スタッフ] メニュー取得（営業状況に関わらず常に全件） */
function apiGetMenuForStaff() {
  return JSON.stringify(getMenuForStaff());
}

/** [スタッフ] 営業状況更新 */
function apiUpdateBusinessStatus(paramsJson) {
  var params = JSON.parse(paramsJson);
  return JSON.stringify(updateBusinessStatus(params));
}

/** [スタッフ] メニュー追加 */
function apiAddMenuItem(paramsJson) {
  return JSON.stringify(addMenuItem(JSON.parse(paramsJson)));
}

/** [スタッフ] メニュー削除 */
function apiDeleteMenuItem(rowIndex) {
  return JSON.stringify(deleteMenuItem(parseInt(rowIndex, 10)));
}

/** [スタッフ] 残数更新 */
function apiUpdateMenuItemStock(rowIndex, stock) {
  return JSON.stringify(updateMenuItemStock(parseInt(rowIndex, 10), stock));
}

/** [スタッフ] 非表示トグル */
function apiToggleMenuItemHidden(rowIndex) {
  return JSON.stringify(toggleMenuItemHidden(parseInt(rowIndex, 10)));
}

/** [スタッフ] 並び順変更 */
function apiMoveMenuItem(rowIndex, direction) {
  return JSON.stringify(moveMenuItem(parseInt(rowIndex, 10), direction));
}

/** [スタッフ] 本日の売上取得（スマレジ） */
function apiGetTodaySales() {
  return JSON.stringify(getDailySalesReport());
}

/** [スタッフ] 月別売上取得（スマレジ） */
function apiGetMonthlySales(yearMonth) {
  return JSON.stringify(getMonthlySalesReport(yearMonth));
}

// ============================================================
// 引き継ぎ API（昼・夜）
// ============================================================

/** [スタッフ] 宿題マスタ取得 */
function apiGetHomeworkMaster() {
  return JSON.stringify(getHomeworkMaster());
}

/** [スタッフ] 宿題マスタに追加 */
function apiAddHomeworkItem(paramsJson) {
  var params = JSON.parse(paramsJson);
  return JSON.stringify(addHomeworkItem(params.category, params.content));
}

/** [スタッフ] 引き継ぎ_昼 保存 */
function apiSaveDayHandover(paramsJson) {
  return JSON.stringify(saveDayHandover(JSON.parse(paramsJson)));
}

/** [スタッフ] 引き継ぎ_昼 取得 */
function apiGetDayHandoverToday() {
  return JSON.stringify(getDayHandoverToday());
}

/** [スタッフ] 引き継ぎ_夜 保存 */
function apiSaveNightHandover(paramsJson) {
  return JSON.stringify(saveNightHandover(JSON.parse(paramsJson)));
}

/** [スタッフ] 引き継ぎ_夜 取得 */
function apiGetNightHandoverToday() {
  return JSON.stringify(getNightHandoverToday());
}

/** [スタッフ] 当日削除おばんざい取得 */
function apiGetDeletedObanzaiToday() {
  return JSON.stringify(getDeletedObanzaiToday());
}

/** [スタッフ] 朝の確認データ取得（前夜引き継ぎ＋宿題） */
function apiGetMorningCheckData() {
  return JSON.stringify(getMorningCheckData());
}
