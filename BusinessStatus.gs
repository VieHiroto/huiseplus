// ============================================================
// BusinessStatus.gs
// 営業状況管理
// ============================================================

var BUSINESS_STATUS = {
  NORMAL: '通常営業',
  CHARTER: '貸切',
  CLOSED: '臨時休業',
  SPECIAL: '特別時間'
};

/**
 * 現在の営業状況を取得（お客様表示・スタッフ表示共通）
 * @returns {Object} 営業状況オブジェクト
 */
function getBusinessStatus() {
  var status        = getBusinessValue('本日ステータス') || BUSINESS_STATUS.NORMAL;
  var normalOpen    = getBusinessValue('通常営業開始') || '11:00';
  var normalClose   = getBusinessValue('通常営業終了') || '22:00';
  var specialOpen   = getBusinessValue('特別営業開始') || '';
  var specialClose  = getBusinessValue('特別営業終了') || '';
  var specialNote   = getBusinessValue('特別備考') || '';
  var waitMin       = parseInt(getBusinessValue('待ち時間（分）') || '0', 10);
  var hotpepperUrl  = getBusinessValue('ホットペッパーURL') || '';
  var tomorrowPlan  = getBusinessValue('明日の予定') || BUSINESS_STATUS.NORMAL;

  var displayOpen  = normalOpen;
  var displayClose = normalClose;

  if (status === BUSINESS_STATUS.SPECIAL && specialOpen) {
    displayOpen  = specialOpen;
    displayClose = specialClose;
  }

  return {
    status: status,
    normalOpen: normalOpen,
    normalClose: normalClose,
    specialOpen: specialOpen,
    specialClose: specialClose,
    specialNote: specialNote,
    displayOpen: displayOpen,
    displayClose: displayClose,
    waitMin: waitMin,
    hasWait: waitMin > 0,
    hotpepperUrl: hotpepperUrl,
    tomorrowPlan: tomorrowPlan,
    isOpen: _isCurrentlyOpen(status, displayOpen, displayClose)
  };
}

/**
 * 営業ステータスを更新（スタッフ操作）
 */
function updateBusinessStatus(params) {
  try {
    if (params.status)       setBusinessValue('本日ステータス', params.status);
    if (params.specialOpen)  setBusinessValue('特別営業開始', params.specialOpen);
    if (params.specialClose) setBusinessValue('特別営業終了', params.specialClose);
    if (params.specialNote !== undefined) setBusinessValue('特別備考', params.specialNote);
    if (params.waitMin !== undefined)     setBusinessValue('待ち時間（分）', params.waitMin);
    if (params.hotpepperUrl !== undefined) setBusinessValue('ホットペッパーURL', params.hotpepperUrl);
    if (params.tomorrowPlan) setBusinessValue('明日の予定', params.tomorrowPlan);
    if (params.normalOpen)   setBusinessValue('通常営業開始', params.normalOpen);
    if (params.normalClose)  setBusinessValue('通常営業終了', params.normalClose);

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
function _isCurrentlyOpen(status, openTime, closeTime) {
  if (status === BUSINESS_STATUS.CLOSED || status === BUSINESS_STATUS.CHARTER) {
    return false;
  }

  var now = new Date();
  var openParts  = openTime.split(':');
  var closeParts = closeTime.split(':');

  var openMinutes  = parseInt(openParts[0], 10) * 60 + parseInt(openParts[1], 10);
  var closeMinutes = parseInt(closeParts[0], 10) * 60 + parseInt(closeParts[1], 10);
  var nowMinutes   = now.getHours() * 60 + now.getMinutes();

  // 日をまたぐケース（例: 23:00 〜 02:00）
  if (closeMinutes < openMinutes) {
    return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
  }

  return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
}
