// ============================================================
// MenuManager.gs
// メイン・おばんざい ホワイトボード管理
// ============================================================

var MENU_CATEGORY = {
  MAIN: 'メイン',
  OBANZAI: 'おばんざい'
};

var MAIN_SUB_CATEGORIES = ['肉', '魚', '大人のお子様', 'ヘルシー'];
var STOCK_OPTIONS = ['ある', '少し', 'ない'];

// シート列インデックス（0始まり）
var MCOL = {
  CATEGORY:     0,
  SUB_CATEGORY: 1,
  NAME:         2,
  DESCRIPTION:  3,
  QUANTITY:     4,
  STOCK:        5,
  HIDDEN:       6,
  SORT_ORDER:   7,
  ADDED_AT:     8
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
    if (!row[MCOL.NAME]) continue;

    var item = {
      rowIndex:    i + 1,
      category:    row[MCOL.CATEGORY],
      subCategory: row[MCOL.SUB_CATEGORY] || '',
      name:        row[MCOL.NAME],
      description: row[MCOL.DESCRIPTION] || '',
      quantity:    row[MCOL.QUANTITY] || '',
      stock:       row[MCOL.STOCK] || 'ある',
      hidden:      row[MCOL.HIDDEN] === true || row[MCOL.HIDDEN] === '非表示',
      sortOrder:   isNaN(parseInt(row[MCOL.SORT_ORDER], 10)) ? i : parseInt(row[MCOL.SORT_ORDER], 10),
      addedAt:     row[MCOL.ADDED_AT] ? String(row[MCOL.ADDED_AT]) : ''
    };

    if (row[MCOL.CATEGORY] === MENU_CATEGORY.MAIN) {
      main.push(item);
    } else if (row[MCOL.CATEGORY] === MENU_CATEGORY.OBANZAI) {
      obanzai.push(item);
    }
  }

  main.sort(function(a, b) { return a.sortOrder - b.sortOrder; });
  obanzai.sort(function(a, b) { return a.sortOrder - b.sortOrder; });

  return { main: main, obanzai: obanzai };
}

/**
 * メニュー追加
 * @param {Object} params - { category, subCategory, name, description, quantity }
 */
function addMenuItem(params) {
  var category    = params.category;
  var subCategory = params.subCategory || '';
  var name        = params.name ? String(params.name).trim() : '';
  var description = params.description || '';
  var quantity    = params.quantity || '';

  if (!category || !name) {
    return { success: false, error: '品名を入力してください' };
  }

  if ([MENU_CATEGORY.MAIN, MENU_CATEGORY.OBANZAI].indexOf(category) === -1) {
    return { success: false, error: '不正なカテゴリです' };
  }

  if (category === MENU_CATEGORY.MAIN && MAIN_SUB_CATEGORIES.indexOf(subCategory) === -1) {
    return { success: false, error: 'サブカテゴリを選択してください' };
  }

  var sheet = getSheet(SHEET_NAMES.MENU);
  var now = new Date().toLocaleString('ja-JP');
  var sortOrder = sheet.getLastRow(); // 末尾に追加

  sheet.appendRow([
    category, subCategory, name, description, quantity,
    'ある', false, sortOrder, now
  ]);

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
 * 残数更新
 * @param {number} rowIndex
 * @param {string} stock - 'ある' / '少し' / 'ない'
 */
function updateMenuItemStock(rowIndex, stock) {
  if (STOCK_OPTIONS.indexOf(stock) === -1) {
    return { success: false, error: '不正な残数です' };
  }
  var sheet = getSheet(SHEET_NAMES.MENU);
  sheet.getRange(rowIndex, MCOL.STOCK + 1).setValue(stock);
  return { success: true, menu: getMenu() };
}

/**
 * 非表示トグル
 * @param {number} rowIndex
 */
function toggleMenuItemHidden(rowIndex) {
  var sheet = getSheet(SHEET_NAMES.MENU);
  var cell = sheet.getRange(rowIndex, MCOL.HIDDEN + 1);
  var current = cell.getValue();
  var newVal = !(current === true || current === '非表示');
  cell.setValue(newVal);
  return { success: true, menu: getMenu() };
}

/**
 * 並び順変更（同一カテゴリ内で上/下に移動）
 * @param {number} rowIndex
 * @param {string} direction - 'up' / 'down'
 */
function moveMenuItem(rowIndex, direction) {
  var sheet = getSheet(SHEET_NAMES.MENU);
  var values = sheet.getDataRange().getValues();
  var currentRow = values[rowIndex - 1];
  var category = currentRow[MCOL.CATEGORY];

  var categoryItems = [];
  for (var i = 1; i < values.length; i++) {
    if (values[i][MCOL.CATEGORY] === category) {
      categoryItems.push({
        sheetRow: i + 1,
        sortOrder: isNaN(parseInt(values[i][MCOL.SORT_ORDER], 10)) ? i : parseInt(values[i][MCOL.SORT_ORDER], 10)
      });
    }
  }
  categoryItems.sort(function(a, b) { return a.sortOrder - b.sortOrder; });

  var pos = -1;
  for (var j = 0; j < categoryItems.length; j++) {
    if (categoryItems[j].sheetRow === rowIndex) { pos = j; break; }
  }

  var swapPos = direction === 'up' ? pos - 1 : pos + 1;
  if (pos === -1 || swapPos < 0 || swapPos >= categoryItems.length) {
    return { success: false, error: '移動できません' };
  }

  var myOrder   = categoryItems[pos].sortOrder;
  var swapOrder = categoryItems[swapPos].sortOrder;
  sheet.getRange(rowIndex, MCOL.SORT_ORDER + 1).setValue(swapOrder);
  sheet.getRange(categoryItems[swapPos].sheetRow, MCOL.SORT_ORDER + 1).setValue(myOrder);

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

  for (var i = values.length - 1; i >= 1; i--) {
    if (values[i][MCOL.CATEGORY] === category) {
      sheet.deleteRow(i + 1);
    }
  }
  return { success: true, menu: getMenu() };
}
