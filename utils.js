/**
 * 解析日期字符串为时间戳
 * @param {string} dateStr - 日期字符串
 * @param {string} format - 日期格式（可选）
 * @returns {number|null} - 时间戳或null
 */
export function parseDate(dateStr, format = null) {
    if (!dateStr) return null;
    if (format) {
        return dayjs(dateStr, format).valueOf();
    }
    const date = dayjs(dateStr);
    return date.isValid() ? date.valueOf() : null;
}

/**
 * 按指定字段对数组进行分组
 * @param {Array} array - 要分组的数组
 * @param {string} key - 分组的键
 * @returns {Object} - 分组后的对象
 */
export function groupBy(array, key) {
    return array.reduce((result, item) => {
        (result[item[key]] = result[item[key]] || []).push(item);
        return result;
    }, {});
}

/**
 * 计算年龄
 * @param {string} idNumber - 身份证号
 * @param {string|number|Date} visitDate - 就诊日期
 * @returns {number|null} - 年龄或null
 */
export function calculateAge(idNumber, visitDate) {
    if (!idNumber || !visitDate || idNumber === '身份证号') return null;
    try {
        let cleanedIdNumber = String(idNumber).replace(/[^0-9Xx]/g, '');
        cleanedIdNumber = cleanedIdNumber.replace(/x$/i, 'X');
        let birthYear;
        if (cleanedIdNumber.length === 18) {
            birthYear = parseInt(cleanedIdNumber.substring(6, 10));
        } else if (cleanedIdNumber.length === 15) {
            birthYear = parseInt('19' + cleanedIdNumber.substring(6, 8));
        } else {
            console.warn(`身份证号格式不正确: ${cleanedIdNumber} (原始值: ${idNumber})`);
            return null;
        }
        let visitYear;
        if (typeof visitDate === 'string') {
            if (visitDate.includes('-') || visitDate.includes('/')) {
                const date = new Date(visitDate);
                visitYear = !isNaN(date.getTime()) ? date.getFullYear() : parseInt(visitDate.substring(0, 4));
            } else if (visitDate.length >= 4 && !isNaN(visitDate.substring(0, 4))) {
                visitYear = parseInt(visitDate.substring(0, 4));
            } else {
                return null;
            }
        } else if (visitDate instanceof Date) {
            visitYear = visitDate.getFullYear();
        } else {
            try {
                const date = new Date(visitDate);
                if (!isNaN(date.getTime())) {
                    visitYear = date.getFullYear();
                } else {
                    const dateStr = String(visitDate);
                    visitYear = dateStr.length >= 4 ? parseInt(dateStr.substring(0, 4)) : null;
                }
            } catch (e) {
                return null;
            }
        }
        if (!birthYear || !visitYear || birthYear > visitYear) {
            return null;
        }
        return visitYear - birthYear;
    } catch (e) {
        console.error('计算年龄时出错:', e);
        return null;
    }
};

 /**
* 计算违规汇总信息
* @param {Array} violations - 违规数据
* @returns {Object} - 包含总违规次数和总金额的对象
*/
export function calculateViolationSummary(violations) {
 let totalViolationCount = 0;
 let totalViolationAmount = 0;
 
 violations.forEach(row => {
   const violationCount = parseInt(row['违规次数']) || 0;
   const price = parseFloat(row['单价']) || 0;
   
   totalViolationCount += violationCount;
   totalViolationAmount += violationCount * price;
 });
 
 return {
   totalViolationCount,
   totalViolationAmount: totalViolationAmount.toFixed(2)
 };
};

/**
 * 格式化日期为yyyymmdd
 * @param {Date|number|string} date - 日期对象、时间戳或日期字符串
 * @returns {string} - 格式化后的日期字符串
 */
export function formatDateToYYYYMMDD(date) {
    if (!date) return '';
    
    let dateObj;
    if (typeof date === 'number') {
      dateObj = new Date(date);
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        // 如果无法解析，尝试处理Excel日期数字
        if (/^\d+$/.test(date)) {
          const excelDate = parseInt(date);
          if (excelDate > 0) {
            // Excel日期是从1900年1月1日开始的天数
            dateObj = new Date((excelDate - (25567 + 2)) * 86400 * 1000);
          }
        }
      }
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return '';
    }
    
    if (isNaN(dateObj.getTime())) return '';
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}${month}${day}`;
  };
