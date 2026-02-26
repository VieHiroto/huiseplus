// ============================================================
// HandoverSheet.gs
// 引き継ぎシート管理（昼・夜）
// ============================================================

var HOMEWORK_CATEGORIES = ['仕込み', '発注', '掃除', 'その他'];

// ============================================================
// 宿題マスタ管理
// ============================================================

/**
 * 宿題マスタを全件取得
 * @returns {Array} [{rowIndex, category, content, addedAt}]
 */
function getHomeworkMaster() {
  var sheet = getSheet(SHEET_NAMES.HANDOVER_HOMEWORK);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row[1]) continue; // 内容が空の行はスキップ
    result.push({
      rowIndex: i + 1,
      category: String(row[0] || ''),
      content:  String(row[1] || ''),
      addedAt:  String(row[2] || '')
    });
  }
  return result;
}

/**
 * 宿題マスタに新しいアイテムを追加
 * @param {string} category - 仕込み / 発注 / 掃除 / その他
 * @param {string} content  - 宿題内容
 */
function addHomeworkItem(category, content) {
  if (HOMEWORK_CATEGORIES.indexOf(category) === -1) {
    return { success: false, error: '不正なカテゴリです' };
  }
  content = String(content || '').trim();
  if (!content) {
    return { success: false, error: '内容を入力してください' };
  }

  var sheet = getSheet(SHEET_NAMES.HANDOVER_HOMEWORK);
  var today = _formatDateHandover(new Date());
  sheet.appendRow([category, content, today]);

  return { success: true, homework: getHomeworkMaster() };
}

// ============================================================
// 引き継ぎ_昼
// ============================================================

/**
 * 引き継ぎ_昼 の今日分を保存
 * @param {Object} params - { activeIds: [rowIndex, ...], notes: '' }
 */
function saveDayHandover(params) {
  var sheet = getSheet(SHEET_NAMES.HANDOVER_DAY);
  var today = _formatDateHandover(new Date());
  var values = sheet.getDataRange().getValues();

  var rowData = [
    today,
    JSON.stringify(params.activeIds || []),
    params.notes || ''
  ];

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).substring(0, 10) === today) {
      sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
      return { success: true };
    }
  }

  sheet.appendRow(rowData);
  return { success: true };
}

/**
 * 引き継ぎ_昼 の今日分を取得
 * @returns {Object} { activeIds: [], notes: '' }
 */
function getDayHandoverToday() {
  var sheet = getSheet(SHEET_NAMES.HANDOVER_DAY);
  if (!sheet) return { activeIds: [], notes: '' };

  var today = _formatDateHandover(new Date());
  var values = sheet.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).substring(0, 10) === today) {
      var activeIds = [];
      try { activeIds = JSON.parse(String(values[i][1] || '[]')); } catch (e) {}
      return {
        activeIds: activeIds,
        notes:     String(values[i][2] || '')
      };
    }
  }

  return { activeIds: [], notes: '' };
}

// ============================================================
// 引き継ぎ_夜
// ============================================================

/**
 * 引き継ぎ_夜 の今日分を保存
 * @param {Object} params
 *   {
 *     floor2: bool,           // 2回フロア掃除
 *     floor3: bool,           // 3回フロア掃除
 *     toilet3: bool,          // 3回トイレ
 *     toilet2: bool,          // 2回トイレ
 *     mainSoldOut: ['品名', ...],
 *     obanzaiCarryOver: [{name, carryOver: bool}, ...],
 *     completedIds: [rowIndex, ...],
 *     notes: ''
 *   }
 */
function saveNightHandover(params) {
  var sheet = getSheet(SHEET_NAMES.HANDOVER_NIGHT);
  var today = _formatDateHandover(new Date());
  var values = sheet.getDataRange().getValues();

  var rowData = [
    today,
    params.floor2  ? true : false,
    params.floor3  ? true : false,
    params.toilet3 ? true : false,
    params.toilet2 ? true : false,
    JSON.stringify(params.mainSoldOut       || []),
    JSON.stringify(params.obanzaiCarryOver  || []),
    JSON.stringify(params.completedIds      || []),
    params.notes || ''
  ];

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).substring(0, 10) === today) {
      sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
      return { success: true };
    }
  }

  sheet.appendRow(rowData);
  return { success: true };
}

/**
 * 引き継ぎ_夜 の今日分を取得
 */
function getNightHandoverToday() {
  var sheet = getSheet(SHEET_NAMES.HANDOVER_NIGHT);
  if (!sheet) return _emptyNight();

  var today = _formatDateHandover(new Date());
  var values = sheet.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).substring(0, 10) === today) {
      var row = values[i];
      var mainSoldOut = [], obanzaiCarryOver = [], completedIds = [];
      try { mainSoldOut      = JSON.parse(String(row[5] || '[]')); } catch (e) {}
      try { obanzaiCarryOver = JSON.parse(String(row[6] || '[]')); } catch (e) {}
      try { completedIds     = JSON.parse(String(row[7] || '[]')); } catch (e) {}
      return {
        floor2:           row[1] === true || row[1] === 'TRUE',
        floor3:           row[2] === true || row[2] === 'TRUE',
        toilet3:          row[3] === true || row[3] === 'TRUE',
        toilet2:          row[4] === true || row[4] === 'TRUE',
        mainSoldOut:      mainSoldOut,
        obanzaiCarryOver: obanzaiCarryOver,
        completedIds:     completedIds,
        notes:            String(row[8] || '')
      };
    }
  }

  return _emptyNight();
}

function _emptyNight() {
  return {
    floor2: false, floor3: false, toilet3: false, toilet2: false,
    mainSoldOut: [], obanzaiCarryOver: [], completedIds: [], notes: ''
  };
}

// ============================================================
// おばんざい削除ログ
// ============================================================

/**
 * 当日に削除されたおばんざいメニューを取得
 * @returns {Array} [{name}]
 */
function getDeletedObanzaiToday() {
  var sheet = getSheet(SHEET_NAMES.MENU_DELETE_LOG);
  if (!sheet) return [];

  var today = _formatDateHandover(new Date());
  var values = sheet.getDataRange().getValues();
  var result = [];
  var seen = {};

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    // row[0] は削除日時（例: '2026/02/26 12:34:56' または Date型）
    var deletedDate = '';
    if (row[0] instanceof Date) {
      deletedDate = _formatDateHandover(row[0]);
    } else {
      // 'YYYY/MM/DD HH:MM:SS' → 'YYYY-MM-DD' に変換
      deletedDate = String(row[0]).substring(0, 10).replace(/\//g, '-');
    }

    if (deletedDate === today && String(row[1]) === 'おばんざい') {
      var name = String(row[3] || '');
      if (name && !seen[name]) {
        seen[name] = true;
        result.push({ name: name });
      }
    }
  }

  return result;
}

// ============================================================
// ユーティリティ
// ============================================================

function _formatDateHandover(date) {
  return date.getFullYear() + '-' +
    _pad(date.getMonth() + 1) + '-' +
    _pad(date.getDate());
}
