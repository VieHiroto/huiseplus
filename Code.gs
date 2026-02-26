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

/** [顧客・スタッフ共通] メニュー取得 */
function apiGetMenu() {
  return JSON.stringify(getMenu());
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

/** [スタッフ] カテゴリ別クリア */
function apiClearMenuByCategory(category) {
  return JSON.stringify(clearMenuByCategory(category));
}

/** [スタッフ] メニュー全クリア */
function apiClearMenu() {
  return JSON.stringify(clearAllMenu());
}

/** [スタッフ] 本日の売上取得（スマレジ） */
function apiGetTodaySales() {
  return JSON.stringify(getDailySalesReport());
}

/** [スタッフ] 月別売上取得（スマレジ） */
function apiGetMonthlySales(yearMonth) {
  return JSON.stringify(getMonthlySalesReport(yearMonth));
}

/** [スタッフ] 引き継ぎシート（メニュー）生成 */
function apiGenerateHandover() {
  return JSON.stringify(generateHandoverFromMenu());
}

/** [スタッフ] 引き継ぎシート（メニュー）今日分取得 */
function apiGetHandoverMenu() {
  return JSON.stringify(getHandoverMenuToday());
}

/** [スタッフ] 引き継ぎシート（メニュー）行更新 */
function apiUpdateHandoverMenuRow(rowIndex, remaining, needPrep, note) {
  return JSON.stringify(updateHandoverMenuRow(parseInt(rowIndex, 10), remaining, needPrep, note));
}

/** [スタッフ] 引き継ぎシート（通常）保存 */
function apiSaveHandoverGeneral(paramsJson) {
  var params = JSON.parse(paramsJson);
  return JSON.stringify(saveHandoverGeneral(params));
}

/** [スタッフ] 引き継ぎシート（通常）取得 */
function apiGetHandoverGeneral() {
  return JSON.stringify(getHandoverGeneral(10));
}
