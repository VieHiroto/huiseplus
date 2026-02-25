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
//   1. スマレジ開発者ポータル (https://developer.smaregi.jp/) でアプリを作成
//   2. 「クライアントID」と「クライアントシークレット」を取得
//   3. 以下の CONTRACT_ID / CLIENT_ID / CLIENT_SECRET を書き換える
// ============================================================

var SMAREGI_CONFIG = {
  CONTRACT_ID:     'YOUR_CONTRACT_ID',     // ← スマレジ契約ID（管理画面URLに表示）
  CLIENT_ID:       'YOUR_CLIENT_ID',       // ← クライアントID
  CLIENT_SECRET:   'YOUR_CLIENT_SECRET',   // ← クライアントシークレット
  SCOPE:           'pos.transactions:read', // 必要なスコープ（複数なら空白区切り）
  TOKEN_URL:       'https://id.smaregi.jp/app/{CONTRACT_ID}/token',
  BASE_URL:        'https://api.smaregi.jp'
};

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
    // キャンセル・返品を除外
    if (t.cancel_flg === '1') return;

    totalAmount += parseFloat(t.total || t.total_price || 0);
    customerCount += parseInt(t.customer_count || 1, 10);
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
 * 指定月の日別売上を取得
 * @param {string} yearMonth - 'YYYY-MM' 形式
 * @returns {Array} [{ date, dayOfWeek, customerCount, totalAmount }, ...]
 */
function getMonthlySales(yearMonth) {
  if (!yearMonth) {
    var now = new Date();
    yearMonth = now.getFullYear() + '-' + _pad(now.getMonth() + 1);
  }

  var parts = yearMonth.split('-');
  var year = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10);

  var fromDate = yearMonth + '-01';
  var lastDay = new Date(year, month, 0).getDate();
  var toDate = yearMonth + '-' + _pad(lastDay);

  var data = _smaregiRequest('/pos/transactions', {
    'sum_date-from': fromDate,
    'sum_date-to': toDate,
    limit: 9999
  });

  if (!data) {
    return [];
  }

  var transactions = Array.isArray(data) ? data : (data.result || []);

  // 日付ごとに集計
  var dailyMap = {};
  transactions.forEach(function(t) {
    if (t.cancel_flg === '1') return;

    var sumDate = (t.sum_date || t.transaction_date || '').substring(0, 10);
    if (!sumDate) return;

    if (!dailyMap[sumDate]) {
      dailyMap[sumDate] = { customerCount: 0, totalAmount: 0 };
    }
    dailyMap[sumDate].totalAmount += parseFloat(t.total || t.total_price || 0);
    dailyMap[sumDate].customerCount += parseInt(t.customer_count || 1, 10);
  });

  var DOW = ['日', '月', '火', '水', '木', '金', '土'];
  var result = [];
  for (var day = 1; day <= lastDay; day++) {
    var dateStr = yearMonth + '-' + _pad(day);
    var d = dailyMap[dateStr] || { customerCount: 0, totalAmount: 0 };
    var dow = DOW[new Date(dateStr).getDay()];
    result.push({
      date: dateStr,
      day: day,
      dayOfWeek: dow,
      customerCount: d.customerCount,
      totalAmount: d.totalAmount
    });
  }

  // 月売上シートに保存
  _saveMonthlySales(yearMonth, result);

  return result;
}

// ============================================================
// シート保存
// ============================================================

function _saveDailySales(date, customerCount, totalAmount) {
  var sheet = getSheet(SHEET_NAMES.DAILY_SALES);
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

// ============================================================
// デバッグ用テスト関数（GASエディタから手動実行）
// ============================================================

/**
 * 接続テスト。GASエディタで「testSmaregiConnection」を選択して実行し、
 * ログ（表示 → ログ）で結果を確認する。
 */
function testSmaregiConnection() {
  Logger.log('=== スマレジ接続テスト開始 ===');
  Logger.log('CONTRACT_ID: ' + SMAREGI_CONFIG.CONTRACT_ID);
  Logger.log('CLIENT_ID:   ' + SMAREGI_CONFIG.CLIENT_ID);

  // 1. トークン取得テスト
  var tokenUrl = SMAREGI_CONFIG.TOKEN_URL.replace('{CONTRACT_ID}', SMAREGI_CONFIG.CONTRACT_ID);
  Logger.log('\n[1] トークン取得URL: ' + tokenUrl);

  var token = _getAccessToken();
  if (!token) {
    Logger.log('❌ トークン取得失敗。CLIENT_ID / CLIENT_SECRET / CONTRACT_ID を確認してください。');
    return;
  }
  Logger.log('✅ トークン取得成功: ' + token.substring(0, 20) + '...');

  // 2. 取引一覧API テスト
  var today = _formatDate(new Date());
  var apiUrl = SMAREGI_CONFIG.BASE_URL + '/' + SMAREGI_CONFIG.CONTRACT_ID +
    '/pos/transactions?sum_date-from=' + today + '&sum_date-to=' + today + '&limit=1';
  Logger.log('\n[2] APIリクエストURL: ' + apiUrl);

  var response = UrlFetchApp.fetch(apiUrl, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true
  });

  Logger.log('レスポンスコード: ' + response.getResponseCode());
  Logger.log('レスポンス本文: ' + response.getContentText().substring(0, 500));

  if (response.getResponseCode() === 404) {
    Logger.log('\n⚠ 404の主な原因:');
    Logger.log('  ① CONTRACT_IDが間違っている');
    Logger.log('     → 現在の値: ' + SMAREGI_CONFIG.CONTRACT_ID);
    Logger.log('     → スマレジ管理画面のURLに表示される英数字（例: T0000001）');
    Logger.log('  ② アプリのスコープが不足している');
    Logger.log('     → 開発者ポータルで「pos.transactions:read」を許可しているか確認');
  }

  Logger.log('\n=== テスト完了 ===');
}
