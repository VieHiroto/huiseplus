// ============================================================
// SpreadsheetSetup.gs
// スプレッドシートの初期セットアップ
// ============================================================

var SHEET_NAMES = {
  BUSINESS: '営業時間管理',
  MENU: 'メニュー管理',
  HANDOVER_MENU: '引き継ぎ_メニュー',
  HANDOVER_GENERAL: '引き継ぎ_通常',
  DAILY_SALES: '日売上',
  MONTHLY_SALES: '月売上'
};

/**
 * 初回セットアップ - 全シートを作成・初期化
 * GASエディタから手動実行
 */
function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  _setupBusinessSheet(ss);
  _setupMenuSheet(ss);
  _setupHandoverMenuSheet(ss);
  _setupHandoverGeneralSheet(ss);
  _setupDailySalesSheet(ss);
  _setupMonthlySalesSheet(ss);

  SpreadsheetApp.flush();
  Logger.log('セットアップ完了');
}

// ---- 各シートセットアップ ----

function _setupBusinessSheet(ss) {
  var sheet = _getOrCreateSheet(ss, SHEET_NAMES.BUSINESS);
  sheet.clearContents();

  var data = [
    ['項目', '値', '備考'],
    ['通常営業開始', '11:00', ''],
    ['通常営業終了', '22:00', ''],
    ['本日ステータス', '通常営業', '通常営業 / 貸切 / 臨時休業 / 特別時間'],
    ['特別営業開始', '', '特別時間のみ使用'],
    ['特別営業終了', '', '特別時間のみ使用'],
    ['特別備考', '', '例：貸切のため外来不可'],
    ['待ち時間（分）', '0', '0=待ちなし'],
    ['ホットペッパーURL', '', '予約ページURL'],
    ['明日の予定', '通常営業', '通常営業 / 貸切 / 休業 / 特別時間']
  ];

  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#f3f3f3');
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 250);
}

function _setupMenuSheet(ss) {
  var sheet = _getOrCreateSheet(ss, SHEET_NAMES.MENU);
  sheet.clearContents();

  var headers = ['カテゴリ', '品名', '追加日時'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#f3f3f3');
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 250);
  sheet.setColumnWidth(3, 180);
}

function _setupHandoverMenuSheet(ss) {
  var sheet = _getOrCreateSheet(ss, SHEET_NAMES.HANDOVER_MENU);
  sheet.clearContents();

  var headers = ['日付', 'カテゴリ', '品名', '残数', '仕込み必要', '備考'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#f3f3f3');
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 250);
  sheet.setColumnWidth(4, 80);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 250);
}

function _setupHandoverGeneralSheet(ss) {
  var sheet = _getOrCreateSheet(ss, SHEET_NAMES.HANDOVER_GENERAL);
  sheet.clearContents();

  var headers = ['日付', '記録者', '本日の状況', '翌日への申し送り', '仕込み一覧'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#f3f3f3');
  [1,2,3,4,5].forEach(function(i, idx) {
    sheet.setColumnWidth(idx+1, [120,100,200,250,250][idx]);
  });
}

function _setupDailySalesSheet(ss) {
  var sheet = _getOrCreateSheet(ss, SHEET_NAMES.DAILY_SALES);
  sheet.clearContents();

  var headers = ['日付', '客数', '売上金額（円）', '取得日時'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#f3f3f3');
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 80);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 180);
}

function _setupMonthlySalesSheet(ss) {
  var sheet = _getOrCreateSheet(ss, SHEET_NAMES.MONTHLY_SALES);
  sheet.clearContents();

  var headers = ['年月', '日', '曜日', '客数', '売上金額（円）'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#f3f3f3');
  [1,2,3,4,5].forEach(function(i, idx) {
    sheet.setColumnWidth(idx+1, [100,60,70,80,150][idx]);
  });
}

// ---- ユーティリティ ----

function _getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

/**
 * 営業時間管理シートから指定項目の値を取得
 */
function getBusinessValue(key) {
  var sheet = getSheet(SHEET_NAMES.BUSINESS);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

/**
 * 営業時間管理シートの指定項目を更新
 */
function setBusinessValue(key, value) {
  var sheet = getSheet(SHEET_NAMES.BUSINESS);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return true;
    }
  }
  return false;
}
