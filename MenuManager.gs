// ============================================================
// MenuManager.gs
// メイン・おばんざい ホワイトボード管理
// ============================================================

var MENU_CATEGORY = {
  MAIN: 'メイン',
  OBANZAI: 'おばんざい'
};

/**
 * 現在のメニュー一覧取得
 * @returns {Object} { main: [...], obanzai: [...] }
 */
function getMenu() {
  var sheet = getSheet(SHEET_NAMES.MENU);
  var values = sheet.getDataRange().getValues();

  var main = [];
  var obanzai = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row[1]) continue; // 品名が空なら飛ばす

    var item = {
      rowIndex: i + 1,
      category: row[0],
      name: row[1],
      addedAt: row[2] ? String(row[2]) : ''
    };

    if (row[0] === MENU_CATEGORY.MAIN) {
      main.push(item);
    } else if (row[0] === MENU_CATEGORY.OBANZAI) {
      obanzai.push(item);
    }
  }

  return { main: main, obanzai: obanzai };
}

/**
 * メニュー追加
 * @param {string} category - 'メイン' または 'おばんざい'
 * @param {string} name - 品名
 */
function addMenuItem(category, name) {
  if (!category || !name || !name.trim()) {
    return { success: false, error: '品名を入力してください' };
  }

  var validCategories = [MENU_CATEGORY.MAIN, MENU_CATEGORY.OBANZAI];
  if (validCategories.indexOf(category) === -1) {
    return { success: false, error: '不正なカテゴリです' };
  }

  var sheet = getSheet(SHEET_NAMES.MENU);
  var now = new Date().toLocaleString('ja-JP');

  sheet.appendRow([category, name.trim(), now]);

  return { success: true, menu: getMenu() };
}

/**
 * メニュー削除（行番号指定）
 * @param {number} rowIndex - シートの行番号（1始まり）
 */
function deleteMenuItem(rowIndex) {
  var sheet = getSheet(SHEET_NAMES.MENU);
  var lastRow = sheet.getLastRow();

  if (rowIndex < 2 || rowIndex > lastRow) {
    return { success: false, error: '不正な行番号です' };
  }

  sheet.deleteRow(rowIndex);
  return { success: true, menu: getMenu() };
}

/**
 * メニューを全クリア（翌日リセット用）
 */
function clearAllMenu() {
  var sheet = getSheet(SHEET_NAMES.MENU);
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  return { success: true };
}

/**
 * カテゴリ別クリア
 */
function clearMenuByCategory(category) {
  var sheet = getSheet(SHEET_NAMES.MENU);
  var values = sheet.getDataRange().getValues();

  // 後ろから削除（行番号がズレないように）
  for (var i = values.length - 1; i >= 1; i--) {
    if (values[i][0] === category) {
      sheet.deleteRow(i + 1);
    }
  }
  return { success: true, menu: getMenu() };
}
