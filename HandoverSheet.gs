// ============================================================
// HandoverSheet.gs
// 引き継ぎシート管理
// ============================================================

/**
 * 引き継ぎシート（メニュー用）の今日分を取得
 */
function getHandoverMenuToday() {
  var sheet = getSheet(SHEET_NAMES.HANDOVER_MENU);
  var today = _formatDateHandover(new Date());
  var values = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (String(row[0]).substring(0, 10) === today) {
      result.push({
        rowIndex: i + 1,
        date: row[0],
        category: row[1],
        name: row[2],
        remaining: row[3],
        needPrep: row[4],
        note: row[5]
      });
    }
  }
  return result;
}

/**
 * 引き継ぎシート（メニュー用）に行を追加・更新
 * メニューシートから自動生成する場合に使用
 */
function saveHandoverMenu(items) {
  var sheet = getSheet(SHEET_NAMES.HANDOVER_MENU);
  var today = _formatDateHandover(new Date());

  // 本日分の既存行を削除
  var values = sheet.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]).substring(0, 10) === today) {
      sheet.deleteRow(i + 1);
    }
  }

  // 新規追加
  items.forEach(function(item) {
    sheet.appendRow([
      today,
      item.category || '',
      item.name || '',
      item.remaining !== undefined ? item.remaining : '',
      item.needPrep || '',
      item.note || ''
    ]);
  });

  return { success: true };
}

/**
 * 引き継ぎシート（メニュー用）の1行を更新（残数・仕込み・備考）
 */
function updateHandoverMenuRow(rowIndex, remaining, needPrep, note) {
  var sheet = getSheet(SHEET_NAMES.HANDOVER_MENU);
  sheet.getRange(rowIndex, 4).setValue(remaining !== undefined ? remaining : '');
  sheet.getRange(rowIndex, 5).setValue(needPrep || '');
  sheet.getRange(rowIndex, 6).setValue(note || '');
  return { success: true };
}

/**
 * メニューシートから本日のメニューを引き継ぎシートに展開
 * スタッフが「引き継ぎ作成」ボタンを押したときに呼ぶ
 */
function generateHandoverFromMenu() {
  var menu = getMenu();
  var allItems = [];

  menu.main.forEach(function(item) {
    allItems.push({
      category: item.category,
      name: item.name,
      remaining: '',
      needPrep: '',
      note: ''
    });
  });

  menu.obanzai.forEach(function(item) {
    allItems.push({
      category: item.category,
      name: item.name,
      remaining: '',
      needPrep: '',
      note: ''
    });
  });

  return saveHandoverMenu(allItems);
}

/**
 * 引き継ぎシート（通常営業用）に記録を追加
 */
function saveHandoverGeneral(params) {
  var sheet = getSheet(SHEET_NAMES.HANDOVER_GENERAL);
  var today = _formatDateHandover(new Date());

  sheet.appendRow([
    today,
    params.author || '',
    params.todayStatus || '',
    params.note || '',
    params.prepList || ''
  ]);

  return { success: true };
}

/**
 * 引き継ぎシート（通常）の直近N件を取得
 */
function getHandoverGeneral(limit) {
  var sheet = getSheet(SHEET_NAMES.HANDOVER_GENERAL);
  var values = sheet.getDataRange().getValues();
  var result = [];
  limit = limit || 10;

  for (var i = Math.max(1, values.length - limit); i < values.length; i++) {
    var row = values[i];
    result.push({
      date: row[0],
      author: row[1],
      todayStatus: row[2],
      note: row[3],
      prepList: row[4]
    });
  }

  return result.reverse();
}

function _formatDateHandover(date) {
  return date.getFullYear() + '-' +
    _pad(date.getMonth() + 1) + '-' +
    _pad(date.getDate());
}
