// ============================================================
// BusinessStatus.gs
// 営業状況管理
// ============================================================

// 区分定数
var BUSINESS_CATEGORY = {
  OPEN:    '営業',
  HOLIDAY: '定休日',
  CLOSED:  '臨時休業',
  CHARTER: '貸切',
  SPECIAL: '特別営業'
};

// getDay() の 0〜6 に対応する曜日名
var _DAY_NAMES = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'];

/**
 * 今日の営業状況を取得（顧客表示・スタッフ表示共通）
 * @returns {Object}
 */
function getBusinessStatus() {
  var todayHours    = _getTodayHours();
  var tomorrowHours = _getHoursForDate(_addDays(new Date(), 1));
  var category      = todayHours.category;

  var isClosed  = (category === BUSINESS_CATEGORY.HOLIDAY ||
                   category === BUSINESS_CATEGORY.CLOSED);
  var isCharter = (category === BUSINESS_CATEGORY.CHARTER);

  var waitMin      = parseInt(getBusinessValue('待ち時間（分）') || '0', 10);
  var hotpepperUrl = getBusinessValue('ホットペッパーURL') || '';
  var specialNote  = todayHours.note || getBusinessValue('特別備考') || '';

  return {
    status:       category,
    isClosed:     isClosed,
    isCharter:    isCharter,
    openTime:     todayHours.open      || '',
    closeTime:    todayHours.close     || '',
    lastOrder:    todayHours.lastOrder || '',
    specialNote:  specialNote,
    waitMin:      waitMin,
    hasWait:      waitMin > 0,
    hotpepperUrl: hotpepperUrl,
    tomorrowPlan: tomorrowHours.category,
    isOpen:       !isClosed && !isCharter && _isCurrentlyOpen(todayHours.open, todayHours.close),
    isSpecialDay: todayHours.isSpecial
  };
}

/**
 * 今日の営業時間情報を取得
 */
function _getTodayHours() {
  return _getHoursForDate(new Date());
}

/**
 * 指定日の営業時間情報を取得
 * 特別営業日シートを優先し、なければ曜日別シートを参照
 */
function _getHoursForDate(date) {
  var special = _checkSpecialDays(date);
  if (special) return special;
  return _getWeeklyHours(date);
}

/**
 * 特別営業日シートで該当日を検索
 */
function _checkSpecialDays(date) {
  var sheet = getSheet(SHEET_NAMES.HOURS_SPECIAL);
  if (!sheet) return null;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;

  var todayStr = Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd');

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row[0]) continue;
    var rowDateStr;
    try {
      rowDateStr = Utilities.formatDate(new Date(row[0]), 'Asia/Tokyo', 'yyyy/MM/dd');
    } catch (e) {
      continue;
    }
    if (rowDateStr === todayStr) {
      return {
        category:  String(row[1] || BUSINESS_CATEGORY.SPECIAL),
        open:      _formatTime(row[2]),
        close:     _formatTime(row[3]),
        lastOrder: _formatTime(row[4]),
        note:      row[5] ? String(row[5]) : '',
        isSpecial: true
      };
    }
  }
  return null;
}

/**
 * 曜日別シートから今日の設定を取得
 */
function _getWeeklyHours(date) {
  var sheet = getSheet(SHEET_NAMES.HOURS_WEEKLY);
  if (!sheet) {
    return { category: BUSINESS_CATEGORY.OPEN, open: '11:00', close: '22:00', lastOrder: '21:30', note: '', isSpecial: false };
  }

  var targetDay = _DAY_NAMES[date.getDay()];
  var values    = sheet.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row[0] === targetDay) {
      return {
        category:  String(row[1] || BUSINESS_CATEGORY.OPEN),
        open:      _formatTime(row[2]),
        close:     _formatTime(row[3]),
        lastOrder: _formatTime(row[4]),
        note:      '',
        isSpecial: false
      };
    }
  }

  // 見つからない場合のデフォルト
  return { category: BUSINESS_CATEGORY.OPEN, open: '11:00', close: '22:00', lastOrder: '21:30', note: '', isSpecial: false };
}

/**
 * スプレッドシートの時間値を "HH:MM" 文字列に変換
 */
function _formatTime(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'string') {
    if (/^\d{1,2}:\d{2}/.test(val)) return val.substring(0, 5);
    return '';
  }
  if (val instanceof Date) {
    var h = val.getHours();
    var m = val.getMinutes();
    return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
  }
  // スプレッドシートの時間は 0〜1 の小数（例: 0.458333 = 11:00）
  if (typeof val === 'number' && val >= 0 && val < 1) {
    var totalMin = Math.round(val * 1440);
    var hh = Math.floor(totalMin / 60) % 24;
    var mm = totalMin % 60;
    return ('0' + hh).slice(-2) + ':' + ('0' + mm).slice(-2);
  }
  return '';
}

/**
 * N日後の Date を返す
 */
function _addDays(date, n) {
  var d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * 雑設定（待ち時間・ホットペッパーURL・特別備考）を更新
 */
function updateBusinessStatus(params) {
  try {
    if (params.waitMin      !== undefined) setBusinessValue('待ち時間（分）',   params.waitMin);
    if (params.hotpepperUrl !== undefined) setBusinessValue('ホットペッパーURL', params.hotpepperUrl);
    if (params.specialNote  !== undefined) setBusinessValue('特別備考',         params.specialNote);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 待ち時間のみ更新
 */
function updateWaitTime(minutes) {
  setBusinessValue('待ち時間（分）', parseInt(minutes, 10) || 0);
  return { success: true };
}

/**
 * 現在営業中かどうか判定
 */
function _isCurrentlyOpen(openTime, closeTime) {
  if (!openTime || !closeTime) return false;

  var now        = new Date();
  var openParts  = openTime.split(':');
  var closeParts = closeTime.split(':');

  var openMin  = parseInt(openParts[0], 10) * 60 + parseInt(openParts[1], 10);
  var closeMin = parseInt(closeParts[0], 10) * 60 + parseInt(closeParts[1], 10);
  var nowMin   = now.getHours() * 60 + now.getMinutes();

  // 日をまたぐケース（例: 23:00 〜 02:00）
  if (closeMin < openMin) {
    return nowMin >= openMin || nowMin < closeMin;
  }
  return nowMin >= openMin && nowMin < closeMin;
}
