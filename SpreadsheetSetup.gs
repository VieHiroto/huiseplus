// ============================================================
// SpreadsheetSetup.gs
// スプレッドシートの初期セットアップ
// ============================================================

var SHEET_NAMES = {
  BUSINESS:        '営業設定',         // 待ち時間・URL等の雑設定
  HOURS_WEEKLY:    '営業時間_曜日別',   // 曜日ごとの基本スケジュール
  HOURS_SPECIAL:   '営業時間_特別日',   // 特別営業日・臨時休業等
  MENU:            'メニュー管理',
  HANDOVER_MENU:   '引き継ぎ_メニュー',
  HANDOVER_GENERAL:'引き継ぎ_通常',
  DAILY_SALES:     '日売上',
  MONTHLY_SALES:   '月売上'
};

/**
 * 初回セットアップ - 全シートを作成・初期化
 * GASエディタから手動実行
 */
function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  _setupBusinessSheet(ss);
  _setupHoursWeeklySheet(ss);
  _setupHoursSpecialSheet(ss);
  _setupMenuSheet(ss);
  _setupHandoverMenuSheet(ss);
  _setupHandoverGeneralSheet(ss);
  _setupDailySalesSheet(ss);
  _setupMonthlySalesSheet(ss);

  SpreadsheetApp.flush();
  Logger.log('セットアップ完了');
}

// ---- 各シートセットアップ ----

/**
 * 営業設定シート（待ち時間・ホットペッパーURL等）
 */
function _setupBusinessSheet(ss) {
  var sheet = _getOrCreateSheet(ss, SHEET_NAMES.BUSINESS);
  sheet.clearContents();

  var data = [
    ['項目', '値', '備考'],
    ['待ち時間（分）', '0', '0=待ちなし'],
    ['ホットペッパーURL', '', '予約ページURL'],
    ['特別備考', '', 'お客様表示の補足メッセージ']
  ];

  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#f3f3f3');
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 260);
}

/**
 * 営業時間_曜日別シート（基本スケジュール）
 */
function _setupHoursWeeklySheet(ss) {
  var sheet = _getOrCreateSheet(ss, SHEET_NAMES.HOURS_WEEKLY);
  sheet.clearContents();

  var headers = ['曜日', '区分', 'オープン', 'クローズ', 'ラストオーダー'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#fff3e0');

  // デフォルト: 月曜定休、火〜日営業
  var rows = [
    ['月曜', '定休日', '', '', ''],
    ['火曜', '営業', '11:00', '22:00', '21:30'],
    ['水曜', '営業', '11:00', '22:00', '21:30'],
    ['木曜', '営業', '11:00', '22:00', '21:30'],
    ['金曜', '営業', '11:00', '22:00', '21:30'],
    ['土曜', '営業', '11:00', '22:00', '21:30'],
    ['日曜', '営業', '11:00', '22:00', '21:30']
  ];
  sheet.getRange(2, 1, rows.length, 5).setValues(rows);

  // 区分の入力規則
  var categoryRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['営業', '定休日'], true)
    .build();
  sheet.getRange(2, 2, 7, 1).setDataValidation(categoryRule);

  // 列幅
  [80, 100, 100, 100, 130].forEach(function(w, i) {
    sheet.setColumnWidth(i + 1, w);
  });
}

/**
 * 営業時間_特別日シート（特別営業・臨時休業等）
 */
function _setupHoursSpecialSheet(ss) {
  var sheet = _getOrCreateSheet(ss, SHEET_NAMES.HOURS_SPECIAL);
  sheet.clearContents();

  var headers = ['日付', '区分', 'オープン', 'クローズ', 'ラストオーダー', '備考'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#e8f4f8');

  // 区分の入力規則
  var categoryRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['特別営業', '臨時休業', '貸切'], true)
    .build();
  sheet.getRange(2, 2, 100, 1).setDataValidation(categoryRule);

  // 日付列の書式
  sheet.getRange(2, 1, 100, 1).setNumberFormat('yyyy/MM/dd');

  [120, 100, 100, 100, 130, 220].forEach(function(w, i) {
    sheet.setColumnWidth(i + 1, w);
  });
}

function _setupMenuSheet(ss) {
  var sheet = _getOrCreateSheet(ss, SHEET_NAMES.MENU);
  sheet.clearContents();

  var headers = ['カテゴリ', 'サブカテゴリ', '品名', '説明', '量', '残数', '非表示', '並び順', '追加日時'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#f3f3f3');
  [120, 130, 200, 250, 100, 80, 80, 80, 180].forEach(function(w, i) {
    sheet.setColumnWidth(i + 1, w);
  });
}

function _setupHandoverMenuSheet(ss) {
  var sheet = _getOrCreateSheet(ss, SHEET_NAMES.HANDOVER_MENU);
  sheet.clearContents();

  var headers = ['日付', 'カテゴリ', '品名', '残数', '仕込み必要', '備考'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#f3f3f3');
  [120, 100, 250, 80, 100, 250].forEach(function(w, i) {
    sheet.setColumnWidth(i + 1, w);
  });
}

function _setupHandoverGeneralSheet(ss) {
  var sheet = _getOrCreateSheet(ss, SHEET_NAMES.HANDOVER_GENERAL);
  sheet.clearContents();

  var headers = ['日付', '記録者', '本日の状況', '翌日への申し送り', '仕込み一覧'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#f3f3f3');
  [120, 100, 200, 250, 250].forEach(function(w, i) {
    sheet.setColumnWidth(i + 1, w);
  });
}

function _setupDailySalesSheet(ss) {
  var sheet = _getOrCreateSheet(ss, SHEET_NAMES.DAILY_SALES);
  sheet.clearContents();

  var headers = ['日付', '客数', '売上金額（円）', '取得日時'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#f3f3f3');
  [120, 80, 150, 180].forEach(function(w, i) {
    sheet.setColumnWidth(i + 1, w);
  });
}

function _setupMonthlySalesSheet(ss) {
  var sheet = _getOrCreateSheet(ss, SHEET_NAMES.MONTHLY_SALES);
  sheet.clearContents();

  var headers = ['年月', '日', '曜日', '客数', '売上金額（円）'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#f3f3f3');
  [100, 60, 70, 80, 150].forEach(function(w, i) {
    sheet.setColumnWidth(i + 1, w);
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
 * 営業設定シートから指定項目の値を取得
 */
function getBusinessValue(key) {
  var sheet = getSheet(SHEET_NAMES.BUSINESS);
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

/**
 * 営業設定シートの指定項目を更新
 */
function setBusinessValue(key, value) {
  var sheet = getSheet(SHEET_NAMES.BUSINESS);
  if (!sheet) return false;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return true;
    }
  }
  return false;
}
