// ============================================================
// SalesReport.gs
// 売上確認（スタッフ向け）
// ============================================================

/**
 * 本日の売上サマリを取得してJSONで返す
 * DoGet経由でも呼び出し可能
 */
function getDailySalesReport() {
  var result = getTodaySales();
  return result;
}

/**
 * 指定月の売上レポートを取得
 * @param {string} yearMonth - 'YYYY-MM'（省略時=今月）
 */
function getMonthlySalesReport(yearMonth) {
  var data = getMonthlySales(yearMonth);

  var totalAmount = 0;
  var totalCustomers = 0;
  data.forEach(function(d) {
    totalAmount += d.totalAmount;
    totalCustomers += d.customerCount;
  });

  return {
    yearMonth: yearMonth || _getCurrentYearMonth(),
    daily: data,
    totalAmount: totalAmount,
    totalCustomers: totalCustomers
  };
}

/**
 * 日・月売上を1つにまとめて返す（スタッフ売上画面用）
 */
function getSalesOverview(yearMonth) {
  var daily = getDailySalesReport();
  var monthly = getMonthlySalesReport(yearMonth);

  return {
    today: daily,
    monthly: monthly
  };
}

function _getCurrentYearMonth() {
  var now = new Date();
  return now.getFullYear() + '-' + _pad(now.getMonth() + 1);
}
