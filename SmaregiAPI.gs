// ============================================================
// SmaregiAPI.gs
// スマレジ フードビジネス API連携
// ============================================================
//
// 【認証の仕組み】
//   スマレジAPIはOAuth 2.0 クライアントクレデンシャルフローを使用。
//   クライアントID + クライアントシークレット → アクセストークンを取得 → APIリクエストに使用。
//   アクセストークンはキャッシュに保存し、有効期限内は再利用する。
//
// 【設定方法】
//   GASエディタ → 「プロジェクトの設定」→「スクリプト プロパティ」に以下を登録：
//     SMAREGI_CONTRACT_ID  : スマレジ契約ID（管理画面URLに表示）
//     SMAREGI_CLIENT_ID    : クライアントID
//     SMAREGI_CLIENT_SECRET: クライアントシークレット
//
//   または setupSmaregiCredentials() を一度実行して登録することも可能。
// ============================================================

var _smaregiProps = PropertiesService.getScriptProperties();
var SMAREGI_CONFIG = {
  CONTRACT_ID:   _smaregiProps.getProperty('SMAREGI_CONTRACT_ID')   || '',
  CLIENT_ID:     _smaregiProps.getProperty('SMAREGI_CLIENT_ID')     || '',
  CLIENT_SECRET: _smaregiProps.getProperty('SMAREGI_CLIENT_SECRET') || '',
  SCOPE:         'pos.transactions:read',
  TOKEN_URL:     'https://id.smaregi.jp/app/{CONTRACT_ID}/token',
  BASE_URL:      'https://api.smaregi.jp'
};

/**
 * スマレジ認証情報をスクリプトプロパティに保存する。
 * GASエディタから一度だけ手動実行する。
 * 実行後はこの関数内の値を空欄に戻すこと。
 */
function setupSmaregiCredentials() {
  PropertiesService.getScriptProperties().setProperties({
    'SMAREGI_CONTRACT_ID':   'ここに契約IDを入力',
    'SMAREGI_CLIENT_ID':     'ここにクライアントIDを入力',
    'SMAREGI_CLIENT_SECRET': 'ここにシークレットを入力'
  });
  Logger.log('スマレジ認証情報を保存しました');
}

// ============================================================
// アクセストークン取得（キャッシュ付き）
// ============================================================

/**
 * アクセストークンを取得する。
 * GASのキャッシュサービスを使って有効期限内は再利用する。
 */
function _getAccessToken() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('smaregi_access_token');
  if (cached) return cached;

  var tokenUrl = SMAREGI_CONFIG.TOKEN_URL.replace('{CONTRACT_ID}', SMAREGI_CONFIG.CONTRACT_ID);

  // Basic認証: Base64(clientId:clientSecret)
  var credentials = Utilities.base64Encode(
    SMAREGI_CONFIG.CLIENT_ID + ':' + SMAREGI_CONFIG.CLIENT_SECRET
  );

  var options = {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + credentials,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    payload: 'grant_type=client_credentials&scope=' + encodeURIComponent(SMAREGI_CONFIG.SCOPE),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(tokenUrl, options);
    var code = response.getResponseCode();
    var body = JSON.parse(response.getContentText());

    if (code !== 200) {
      Logger.log('トークン取得エラー: ' + code + ' ' + JSON.stringify(body));
      return null;
    }

    var token = body.access_token;
    // expires_in（秒）の少し手前でキャッシュを切る（最大6時間）
    var expiresIn = Math.min((body.expires_in || 3600) - 60, 21600);
    cache.put('smaregi_access_token', token, expiresIn);

    return token;
  } catch (e) {
    Logger.log('トークン取得例外: ' + e.message);
    return null;
  }
}

// ============================================================
// APIリクエスト共通処理
// ============================================================

/**
 * スマレジAPIリクエスト共通処理
 */
function _smaregiRequest(endpoint, params) {
  var token = _getAccessToken();
  if (!token) {
    Logger.log('アクセストークンが取得できませんでした');
    return null;
  }

  var url = SMAREGI_CONFIG.BASE_URL + '/' + SMAREGI_CONFIG.CONTRACT_ID + endpoint;

  if (params) {
    var queryStr = Object.keys(params).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    url += '?' + queryStr;
  }

  var options = {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();

    if (code === 401) {
      // トークン期限切れの場合はキャッシュを削除して再試行
      CacheService.getScriptCache().remove('smaregi_access_token');
      Logger.log('トークン期限切れ。再取得してください。');
      return null;
    }

    if (code !== 200) {
      Logger.log('Smaregi APIエラー: ' + code + ' ' + response.getContentText());
      return null;
    }

    return JSON.parse(response.getContentText());
  } catch (e) {
    Logger.log('Smaregi API例外: ' + e.message);
    return null;
  }
}

// ============================================================
// 売上取得
// ============================================================

/**
 * 本日の売上を取得
 * @returns {Object} { date, customerCount, totalAmount }
 */
function getTodaySales() {
  var today = _formatDate(new Date());

  var data = _smaregiRequest('/pos/transactions', {
    'sum_date-from': today,
    'sum_date-to': today,
    limit: 1000
  });

  if (!data) {
    return { date: today, customerCount: 0, totalAmount: 0, error: 'APIエラー' };
  }

  var transactions = Array.isArray(data) ? data : (data.result || []);
  var totalAmount = 0;
  var customerCount = 0;

  transactions.forEach(function(t) {
    // キャンセル・返品を除外（Smaregi APIはcancelDivision: '1'）
    if (t.cancelDivision === '1' || t.cancel_flg === '1') return;

    totalAmount += parseFloat(t.total || t.subtotal || t.unitNonDiscountsubtotal || 0);
    customerCount += parseInt(t.customerCount || t.customer_count || 1, 10);
  });

  // 日売上シートに保存
  _saveDailySales(today, customerCount, totalAmount);

  return {
    date: today,
    customerCount: customerCount,
    totalAmount: totalAmount
  };
}

/**
 * 指定月の日別売上を /daily_summaries から取得
 * （締め処理済みの日のみ。当日分は getTodaySales を使うこと）
 * @param {string} yearMonth - 'YYYY-MM' 形式
 * @returns {Array} [{ date, day, dayOfWeek, customerCount, totalAmount }, ...]
 */
function getMonthlySales(yearMonth) {
  if (!yearMonth) {
    var now = new Date();
    yearMonth = now.getFullYear() + '-' + _pad(now.getMonth() + 1);
  }

  var parts = yearMonth.split('-');
  var year  = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10);

  var fromDate = yearMonth + '-01';
  var lastDay  = new Date(year, month, 0).getDate();
  var toDate   = yearMonth + '-' + _pad(lastDay);

  // sum_date-from/to は未サポートのため1日ずつ取得
  var DOW    = ['日', '月', '火', '水', '木', '金', '土'];
  var result = [];
  for (var day = 1; day <= lastDay; day++) {
    var dateStr = yearMonth + '-' + _pad(day);
    var dow = DOW[new Date(dateStr).getDay()];

    var data = _smaregiRequest('/pos/daily_summaries', {
      'sum_date': dateStr,
      limit: 10   // 1日に複数ドロアがあっても10で十分
    });

    var totalAmount   = 0;
    var customerCount = 0;
    if (data) {
      var summaries = Array.isArray(data) ? data : (data.result || []);
      summaries.forEach(function(s) {
        totalAmount   += parseFloat(s.total || s.salesTotal || 0);
        customerCount += parseInt(s.transactionCount || 0, 10);
      });
    }

    result.push({
      date:          dateStr,
      day:           day,
      dayOfWeek:     dow,
      customerCount: customerCount,
      totalAmount:   totalAmount
    });
  }

  _saveMonthlySales(yearMonth, result);
  return result;
}

// ============================================================
// 自動同期（毎日0時トリガー用）
// ============================================================

/**
 * 前日分の日次締め情報を取得してシートに保存する。
 * GASのトリガーで毎日0時前後に実行する。
 */
function autoSyncDailySummary() {
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var dateStr = _formatDate(yesterday);

  var data = _smaregiRequest('/pos/daily_summaries', {
    'sum_date': dateStr,
    limit: 100
  });

  if (!data) {
    Logger.log('autoSyncDailySummary: APIエラー（' + dateStr + '）');
    return;
  }

  var summaries = Array.isArray(data) ? data : (data.result || []);
  if (summaries.length === 0) {
    Logger.log('autoSyncDailySummary: データなし（' + dateStr + '）締め処理未実施の可能性');
    return;
  }

  var totalAmount   = 0;
  var customerCount = 0;
  summaries.forEach(function(s) {
    totalAmount   += parseFloat(s.total || s.salesTotal || 0);
    customerCount += parseInt(s.transactionCount || 0, 10);
  });

  _saveDailySales(dateStr, customerCount, totalAmount);
  Logger.log('autoSyncDailySummary: 保存完了 ' + dateStr +
    ' 客数=' + customerCount + ' 売上=' + totalAmount);
}

/**
 * 診断テスト：GASエディタで実行してログを確認する
 */
function testDailySummaries() {
  var props = PropertiesService.getScriptProperties().getProperties();
  Logger.log('--- プロパティ確認 ---');
  Logger.log('CONTRACT_ID : ' + (props['SMAREGI_CONTRACT_ID']   ? '✅ 設定済' : '❌ 未設定'));
  Logger.log('CLIENT_ID   : ' + (props['SMAREGI_CLIENT_ID']     ? '✅ 設定済' : '❌ 未設定'));
  Logger.log('CLIENT_SECRET:' + (props['SMAREGI_CLIENT_SECRET'] ? '✅ 設定済' : '❌ 未設定'));

  Logger.log('--- トークン取得 ---');
  var token = _getAccessToken();
  Logger.log(token ? '✅ 取得成功' : '❌ 取得失敗');
  if (!token) return;

  Logger.log('--- /pos/daily_summaries テスト ---');
  var today = _formatDate(new Date());
  var ym    = today.substring(0, 7);         // 'YYYY-MM'
  var from  = ym + '-01';
  var to    = today;

  // パターンA: sum_date-from / sum_date-to
  var resA = _smaregiRequest('/pos/daily_summaries', {
    'sum_date-from': from, 'sum_date-to': to, limit: 10
  });
  Logger.log('[A] sum_date-from/to → ' + (resA === null ? 'null(APIエラー)' : JSON.stringify(resA).substring(0, 200)));

  // パターンB: sum_date 単日（今日）
  var resB = _smaregiRequest('/pos/daily_summaries', { 'sum_date': today, limit: 10 });
  Logger.log('[B] sum_date=' + today + ' → ' + (resB === null ? 'null(APIエラー)' : JSON.stringify(resB).substring(0, 200)));

  // パターンC: パラメータなし（全件先頭10件）
  var resC = _smaregiRequest('/pos/daily_summaries', { limit: 10 });
  Logger.log('[C] 全件 → ' + (resC === null ? 'null(APIエラー)' : JSON.stringify(resC).substring(0, 200)));
}

/**
 * 毎日0時トリガーをセットアップする。
 * GASエディタから一度だけ手動実行する。
 */
function setupDailyTrigger() {
  // 既存の同名トリガーを削除してから登録（重複防止）
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'autoSyncDailySummary') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('autoSyncDailySummary')
    .timeBased()
    .atHour(0)
    .everyDays(1)
    .create();
  Logger.log('トリガー登録完了: autoSyncDailySummary（毎日0時）');
}

// ============================================================
// シート保存
// ============================================================

function _saveDailySales(date, customerCount, totalAmount) {
  var sheet = getSheet(SHEET_NAMES.DAILY_SALES);
  if (!sheet) { Logger.log('シート「日売上」が見つかりません。setupSpreadsheet()を実行してください。'); return; }
  var now = new Date().toLocaleString('ja-JP');

  // 既存行を検索して上書き、なければ追記
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === date) {
      sheet.getRange(i + 1, 1, 1, 4).setValues([[date, customerCount, totalAmount, now]]);
      return;
    }
  }
  sheet.appendRow([date, customerCount, totalAmount, now]);
}

function _saveMonthlySales(yearMonth, data) {
  var sheet = getSheet(SHEET_NAMES.MONTHLY_SALES);
  if (!sheet) { Logger.log('シート「月売上」が見つかりません。setupSpreadsheet()を実行してください。'); return; }

  // 対象年月の既存行を削除
  var values = sheet.getDataRange().getValues();
  var rowsToDelete = [];
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === yearMonth) {
      rowsToDelete.push(i + 1);
    }
  }
  rowsToDelete.forEach(function(r) { sheet.deleteRow(r); });

  // 新規挿入
  data.forEach(function(d) {
    sheet.appendRow([yearMonth, d.day, d.dayOfWeek, d.customerCount, d.totalAmount]);
  });
}

// ============================================================
// ユーティリティ
// ============================================================

function _formatDate(date) {
  return date.getFullYear() + '-' +
    _pad(date.getMonth() + 1) + '-' +
    _pad(date.getDate());
}

function _pad(n) {
  return n < 10 ? '0' + n : String(n);
}

