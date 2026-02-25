// ============================================================
// SmaregiAPI.gs
// スマレジ フードビジネス API連携
// ============================================================

var SMAREGI_CONFIG = {
  CONTRACT_ID: 'YOUR_CONTRACT_ID',   // ← スマレジ契約ID
  ACCESS_TOKEN: 'YOUR_ACCESS_TOKEN', // ← アクセストークン
  BASE_URL: 'https://api.smaregi.jp'
};

/**
 * スマレジAPIリクエスト共通処理
 */
function _smaregiRequest(endpoint, params) {
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
      'Authorization': 'Bearer ' + SMAREGI_CONFIG.ACCESS_TOKEN,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();

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
    sum_date_from: today,
    sum_date_to: today,
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
    sum_date_from: fromDate,
    sum_date_to: toDate,
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
