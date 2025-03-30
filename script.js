import { parseDate, groupBy, calculateAge, calculateViolationSummary, formatDateToYYYYMMDD} from './utils.js';

let workbook = null;
let selectedSheet = null;
let sheetData = null;
let hasDateColumns = false;
let diagnosisColumns = [];
let violationResults = null;
let rehabAssessmentData = null;
let compareFileData = null;

  // ==================== 事件监听器 ====================
  
  // 页面加载完成后的初始化
  document.addEventListener('DOMContentLoaded', function() {
    // 文件上传处理
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const dropArea = document.getElementById('dropArea');

    // 点击上传按钮时触发文件选择
    uploadButton.addEventListener('click', () => {
        fileInput.click();
    });

    // 处理文件选择
    fileInput.addEventListener('change', handleFileUpload);

    // 拖放处理
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
            fileInput.files = e.dataTransfer.files;
            handleFileUpload({ target: { files: [file] } });
        }
    });
    
    // 加载表格按钮
    const loadSheetButton = document.getElementById('loadSheetButton');
    if (loadSheetButton) {
      loadSheetButton.addEventListener('click', loadSelectedSheet);
    }
    
    // 康复评定选项处理
    const rehabYes = document.getElementById('rehabYes');
    const rehabNo = document.getElementById('rehabNo');
    const rehabFileUpload = document.getElementById('rehabFileUpload');
    
    if (rehabYes && rehabFileUpload) {
      rehabYes.addEventListener('change', function() {
        rehabFileUpload.style.display = this.checked ? 'block' : 'none';
      });
    }
    
    if (rehabNo && rehabFileUpload) {
      rehabNo.addEventListener('change', function() {
        rehabFileUpload.style.display = 'none';
      });
    }
    
    // 规则2选择处理 - 日期模式
    const rule2 = document.getElementById('rule2');
    const keywordsInput = document.getElementById('keywordsInput');
    if (rule2 && keywordsInput) {
      rule2.addEventListener('change', function() {
        keywordsInput.style.display = this.checked ? 'block' : 'none';
        console.log("规则2复选框状态变更:", this.checked);
        
        // 如果选中并且文本区域为空，添加一个默认值以帮助用户
        if (this.checked) {
          const textArea = document.getElementById('keywords');
          if (textArea && (!textArea.value || textArea.value.trim() === '')) {
            textArea.value = '哮喘,糖尿病,高血压'; // 默认示例值
          }
        }
      });
    }
    
    // 规则2_nd选择处理 - 非日期模式
    const rule2_nd = document.getElementById('rule2_nd');
    const keywordsInput_nd = document.getElementById('keywordsInput_nd');
    if (rule2_nd && keywordsInput_nd) {
      rule2_nd.addEventListener('change', function() {
        keywordsInput_nd.style.display = this.checked ? 'block' : 'none';
        console.log("规则2_nd复选框状态变更:", this.checked);
        
        // 如果选中并且文本区域为空，添加一个默认值以帮助用户
        if (this.checked) {
          const textArea = document.getElementById('keywords_nd');
          if (textArea && (!textArea.value || textArea.value.trim() === '')) {
            textArea.value = '哮喘,糖尿病,高血压'; // 默认示例值
          }
        }
      });
    }
    
    // 规则1细节处理
    const rule1 = document.getElementById('rule1');
    const rule1Details = document.getElementById('rule1Details');
    if (rule1 && rule1Details) {
      rule1.addEventListener('change', function() {
        rule1Details.style.display = this.checked ? 'block' : 'none';
      });
    }
    
    // 年龄筛选处理
    const ageFilter = document.getElementById('ageFilter');
    const ageInputArea = document.getElementById('ageInputArea');
    if (ageFilter && ageInputArea) {
      ageFilter.addEventListener('change', function() {
        ageInputArea.style.display = this.checked ? 'block' : 'none';
      });
    }
    
    // 规则7处理
    const commonRule7 = document.getElementById('commonRule7');
    const commonCompareFileSection = document.getElementById('commonCompareFileSection');
    if (commonRule7 && commonCompareFileSection) {
      commonRule7.addEventListener('change', function() {
        commonCompareFileSection.style.display = this.checked ? 'block' : 'none';
      });
    }
    
    // 检查记录按钮处理
    const checkRecordsButton = document.getElementById('checkRecordsButton');
    if (checkRecordsButton) {
      checkRecordsButton.addEventListener('click', showCheckRecords);
    }
    
    // 下载记录按钮处理
    const downloadRecordsButton = document.getElementById('downloadRecordsButton');
    if (downloadRecordsButton) {
      downloadRecordsButton.addEventListener('click', downloadResults);
    }
    
    // 处理按钮
    const processButton = document.getElementById('processButton');
    if (processButton) {
      processButton.addEventListener('click', processData);
    }
    
    // 继续筛查按钮
    const continueButton = document.getElementById('continueButton');
    if (continueButton) {
      continueButton.addEventListener('click', resetPage);
    }
    
    const continueButton2 = document.getElementById('continueButton2');
    if (continueButton2) {
      continueButton2.addEventListener('click', resetPage);
    }
    
    // 查看详情按钮
    const showDetailsButton = document.getElementById('showDetailsButton');
    if (showDetailsButton) {
      showDetailsButton.addEventListener('click', showViolationDetails);
    }
    
    // 数据分析按钮
    const analyzeButton = document.getElementById('analyzeButton');
    if (analyzeButton) {
      analyzeButton.addEventListener('click', analyzeViolationResults);
    }
    
    // 下载按钮
    const downloadButton = document.getElementById('downloadButton');
    if (downloadButton) {
      downloadButton.addEventListener('click', downloadResults);
    }
  });
  
  // ==================== 文件处理函数 ====================
  
  /**
   * 处理上传的Excel文件
   * @param {Event} e - 文件上传事件
   */
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // 显示文件名
    const fileNameDisplay = document.getElementById('fileName');
    if (fileNameDisplay) {
      fileNameDisplay.textContent = file.name;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        let data = new Uint8Array(e.target.result);
        workbook = XLSX.read(data, { type: 'array' });
        
        // 显示工作表选择器
        const sheetList = document.getElementById('sheetList');
        sheetList.innerHTML = '';
        
        workbook.SheetNames.forEach(sheetName => {
          const option = document.createElement('option');
          option.value = sheetName;
          option.textContent = sheetName;
          sheetList.appendChild(option);
        });
        
        document.getElementById('sheetSelector').style.display = 'block';
      } catch (error) {
        alert('读取Excel文件时出错: ' + error.message);
        console.error('读取Excel文件时出错:', error);
      }
    };
    
    reader.readAsArrayBuffer(file);
  }
  
  /**
   * 加载选中的工作表
   */
  function loadSelectedSheet() {
    const sheetName = document.getElementById('sheetList').value;
    selectedSheet = sheetName;
    
    // 读取工作表数据
    const worksheet = workbook.Sheets[sheetName];
    
    try {
      // 使用更精确的选项读取数据，确保所有列都被正确识别
      // 将const改为let，允许后续修改
      let tempSheetData = XLSX.utils.sheet_to_json(worksheet, {
        raw: true,
        defval: null,  // 空单元格使用null值
        header: 'A'    // 使用A,B,C作为临时列名
      });
      
      if (tempSheetData.length === 0) {
        alert('选中的工作表没有数据');
        return;
      }
      
      // 获取列名映射（从A,B,C到实际列名）
      let headerRow = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        range: 0
      })[0];
      
      console.log("原始表头行:", headerRow);
      
      // 创建列映射
      let columnMap = {};
      headerRow.forEach((header, index) => {
        const colLetter = XLSX.utils.encode_col(index);
        columnMap[colLetter] = header;
      });
      
      console.log("列映射:", columnMap);
      
      // 转换数据，使用实际列名
      sheetData = tempSheetData.map(row => {
        let newRow = {};
        Object.keys(row).forEach(colLetter => {
          const colName = columnMap[colLetter];
          if (colName) {
            newRow[colName] = row[colLetter];
          }
        });
        return newRow;
      });
      
      // 检查是否有日期列
      hasDateColumns = sheetData[0].hasOwnProperty('入院日期') || sheetData[0].hasOwnProperty('出院日期');
      
      // 获取诊断列
      diagnosisColumns = [];
      
      // 从表头行直接获取诊断列
      headerRow.forEach(header => {
        if (typeof header === 'string' && header.includes('诊断')) {
          diagnosisColumns.push(header);
        }
      });
      
      // 按照诊断列的序号排序
      diagnosisColumns.sort((a, b) => {
        // 提取诊断列名中的数字
        const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
        return numA - numB; // 按数字大小排序
      });
      
      console.log("从表头行找到的诊断列:", diagnosisColumns);
      
      // 预先计算所有患者的年龄
      calculateAllPatientAges(sheetData);
      
      // 显示适用的规则
      document.getElementById('rulesSection').style.display = 'block';
      document.getElementById('dateBasedRules').style.display = hasDateColumns ? 'block' : 'none';
      document.getElementById('nonDateBasedRules').style.display = hasDateColumns ? 'none' : 'block';
      document.getElementById('rehabAssessment').style.display = hasDateColumns ? 'block' : 'none';
      document.getElementById('commonFilters').style.display = 'block';
      
      // 确保关键词输入区域存在并正确设置
      ensureKeywordsInputExists();
      setupRule2KeywordsInput();
    } catch (error) {
      console.error('处理Excel表格时出错:', error);
      alert('处理Excel表格时出错: ' + error.message);
    }
  }
  
  /**
   * 设置规则2关键词输入区域
   */
  function setupRule2KeywordsInput() {
    // 获取规则2复选框
    const rule2Checkbox = hasDateColumns ? 
      document.getElementById('rule2') : 
      document.getElementById('rule2_nd');
    
    // 获取对应的关键词输入区域
    const keywordsInput = hasDateColumns ? 
      document.getElementById('keywordsInput') : 
      document.getElementById('keywordsInput_nd');
    
    // 根据规则2复选框的状态显示或隐藏关键词输入区域
    if (rule2Checkbox && keywordsInput) {
      keywordsInput.style.display = rule2Checkbox.checked ? 'block' : 'none';
      console.log(`setupRule2KeywordsInput: ${hasDateColumns ? '日期' : '非日期'}模式, 显示状态: ${rule2Checkbox.checked}`);
    } else {
      console.warn('找不到规则2复选框或关键词输入区域');
    }
  }
  
  /**
   * 确保关键词输入区域存在于DOM中
   */
  function ensureKeywordsInputExists() {
    // 检查日期规则区域的关键词输入
    const dateBasedRules = document.getElementById('dateBasedRules');
    if (dateBasedRules) {
      let keywordsInput = dateBasedRules.querySelector('#keywordsInput');
      if (!keywordsInput) {
        keywordsInput = document.createElement('div');
        keywordsInput.id = 'keywordsInput';
        keywordsInput.style.display = 'none';
        keywordsInput.style.marginLeft = '25px';
        keywordsInput.style.marginTop = '10px';
        keywordsInput.innerHTML = `
          <p>请输入关键词列表，用逗号分隔：</p>
          <textarea id="keywords" rows="3" class="form-control" placeholder="例如: 关键词1,关键词2,关键词3"></textarea>
        `;
        dateBasedRules.appendChild(keywordsInput);
      }
    }
    
    // 检查非日期规则区域的关键词输入
    const nonDateBasedRules = document.getElementById('nonDateBasedRules');
    if (nonDateBasedRules) {
      let keywordsInput = nonDateBasedRules.querySelector('#keywordsInput');
      if (!keywordsInput) {
        keywordsInput = document.createElement('div');
        keywordsInput.id = 'keywordsInput';
        keywordsInput.style.display = 'none';
        keywordsInput.style.marginLeft = '25px';
        keywordsInput.style.marginTop = '10px';
        keywordsInput.innerHTML = `
          <p>请输入关键词列表，用逗号分隔：</p>
          <textarea id="keywords_nd" rows="3" class="form-control" placeholder="例如: 关键词1,关键词2,关键词3"></textarea>
        `;
        nonDateBasedRules.appendChild(keywordsInput);
      }
  }
  }
  
  /**
   * 预先计算所有患者年龄
   * @param {Array} data - 患者数据
   */
  function calculateAllPatientAges(data) {
    data.forEach(row => {
      // 获取就诊日期
      let visitDate;
      if (row['入院日期']) {
        visitDate = row['入院日期'];
      } else if (row['挂号日期']) {
        visitDate = String(row['挂号日期']);
        
        // 处理数字格式的日期
        if (!isNaN(visitDate) && visitDate.length === 8) {
          const year = visitDate.substring(0, 4);
          const month = visitDate.substring(4, 6);
          const day = visitDate.substring(6, 8);
          visitDate = `${year}-${month}-${day}`;
        }
      } 
      
      // 计算年龄并存储
      row['患者年龄'] = calculateAge(row['身份证号'], visitDate);
    });
  }
  
  // ==================== 数据处理函数 ====================
  
  /**
   * 处理数据
   */
  function processData() {
    console.log('开始处理数据');
    
    // 获取选中的规则
    const dateRules = hasDateColumns ? 
      Array.from(document.querySelectorAll('#dateBasedRules input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value) : [];
    
    const nonDateRules = !hasDateColumns ? 
      Array.from(document.querySelectorAll('#nonDateBasedRules input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value) : [];
    
    const commonRule7 = document.getElementById('commonRule7')?.checked ? ['7'] : [];
    
    // 合并所有选中的规则
    const selectedRules = [...dateRules, ...nonDateRules, ...commonRule7];
    
    console.log('选中的规则:', selectedRules);
    
    if (selectedRules.length === 0) {
      alert('请至少选择一条规则');
      return;
    }
    
    // 显示处理状态
    const processingStatus = document.getElementById('processingStatus');
    if (processingStatus) {
      processingStatus.innerHTML = '正在处理数据...';
    }
    
    // 显示结果区域
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
      resultsSection.style.display = 'block';
    }
    
    // 检查是否需要对比文件
    if (selectedRules.includes('7')) {
      handleCompareFile(selectedRules);
    } else {
      continueProcessing(selectedRules);
    }
  }
  
  /**
   * 处理对比文件
   * @param {Array} selectedRules - 选中的规则
   */
  function handleCompareFile(selectedRules) {
    const compareFile = document.getElementById('commonCompareFileInput').files[0];
    if (!compareFile) {
      alert('项目重复规则需要上传对比Excel文件');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const compareWorkbook = XLSX.read(data, { type: 'array' });
        
        if (compareWorkbook.SheetNames.length === 0) {
          alert('对比文件中没有工作表');
          return;
        }
        
        // 选择工作表
        let compareSheetName = selectedSheet;
        if (!compareWorkbook.Sheets[compareSheetName]) {
          compareSheetName = compareWorkbook.SheetNames[0];
        }
        
        const compareWorksheet = compareWorkbook.Sheets[compareSheetName];
        compareFileData = XLSX.utils.sheet_to_json(compareWorksheet);
        
        if (!compareFileData || compareFileData.length === 0) {
          alert('对比文件中没有数据');
          return;
        }
        
        continueProcessing(selectedRules);
      } catch (error) {
        console.error('读取对比Excel文件时出错:', error);
        alert('读取对比Excel文件时出错: ' + error.message);
      }
    };
    
    reader.onerror = function(error) {
      console.error('读取对比文件时发生错误:', error);
      alert('读取对比文件失败，请检查文件格式');
    };
    
    reader.readAsArrayBuffer(compareFile);
  }
  
  /**
   * 继续处理数据
   * @param {Array} selectedRules - 选中的规则
   */
  function continueProcessing(selectedRules) {
    // 检查是否需要康复评定
    const needsRehabAssessment = hasDateColumns && 
      selectedRules.includes('3') && 
      document.getElementById('rehabYes').checked;
    
    if (needsRehabAssessment) {
      handleRehabFile(selectedRules);
    } else {
      executeViolationChecks(selectedRules);
    }
  }
  
  /**
   * 处理康复评定文件
   * @param {Array} selectedRules - 选中的规则
   */
  function handleRehabFile(selectedRules) {
    const rehabFile = document.getElementById('rehabFileInput').files[0];
    if (!rehabFile) {
      alert('请上传康复评定Excel文件');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const rehabWorkbook = XLSX.read(data, { type: 'array' });
        
        const sheet1 = XLSX.utils.sheet_to_json(rehabWorkbook.Sheets['Sheet1']);
        const sheet2 = XLSX.utils.sheet_to_json(rehabWorkbook.Sheets['Sheet2']);
        
        processRehabAssessmentData(sheet1, sheet2);
        executeViolationChecks(selectedRules);
      } catch (error) {
        alert('读取康复评定Excel文件时出错: ' + error.message);
      }
    };
    
    reader.readAsArrayBuffer(rehabFile);
  }
  
  /**
   * 处理康复评定数据
   * @param {Array} sheet1 - 第一个工作表数据
   * @param {Array} sheet2 - 第二个工作表数据
   */
  function processRehabAssessmentData(sheet1, sheet2) {
    rehabAssessmentData = {};
    
    // 转换日期格式
    sheet1.forEach(row => {
      if (row['入院日期']) {
        row['入院日期'] = parseDate(row['入院日期']);
      }
    });
    
    sheet2.forEach(row => {
      if (row['挂号日期']) {
        row['挂号日期'] = parseDate(row['挂号日期'], 'YYYYMMDD');
      }
    });
    
    // 获取所有身份证号
    const idNumbers = [...new Set(sheetData.map(row => row['身份证号']))];
    
    // 合并每个身份证号的所有康复评定日期
    idNumbers.forEach(idNum => {
      if (!idNum) return;
      
      const sheet1Dates = sheet1
        .filter(row => row['身份证号'] === idNum)
        .map(row => row['入院日期']);
      
      const sheet2Dates = sheet2
        .filter(row => row['身份证号'] === idNum)
        .map(row => row['挂号日期']);
      
      const allDates = [...sheet1Dates, ...sheet2Dates].filter(date => date);
      
      if (allDates.length > 0) {
        allDates.sort((a, b) => a - b);
        rehabAssessmentData[idNum] = allDates;
      }
    });
  }
  
  /**
   * 执行违规检查
   * @param {Array} selectedRules - 选中的规则
   */
  function executeViolationChecks(selectedRules) {
    // 显示处理状态
    const processingStatus = document.getElementById('processingStatus');
    if (processingStatus) {
      processingStatus.innerHTML = '正在处理数据...';
    }
    
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
      resultsSection.style.display = 'block';
    }
    
    // 复制数据以进行处理
    let processedData = [];
    try {
      processedData = JSON.parse(JSON.stringify(sheetData || []));
    } catch (error) {
      console.error('处理数据时出错:', error);
      alert('数据格式错误，请检查上传的Excel文件');
      return;
    }
    
    if (!processedData || !Array.isArray(processedData) || processedData.length === 0) {
      console.error('没有有效的数据可处理');
      alert('没有有效的数据可处理');
      return;
    }
    
    // 转换日期格式
    if (hasDateColumns) {
      processedData.forEach(row => {
        if (row['入院日期']) row['入院日期'] = parseDate(row['入院日期']);
        if (row['出院日期']) row['出院日期'] = parseDate(row['出院日期']);
      });
    }
    
    // 初始化违规次数列
    processedData.forEach(row => {
      row['违规次数'] = 0;
      row['剩余可用次数'] = row['次数'];
    });
    
    // 根据选择的规则进行检查
    for (const rule of selectedRules) {
      if (hasDateColumns) {
        if (rule === '1') {
          processedData = checkRule1(processedData);
          updateViolationCounts(processedData, '违规次数_规则1');
        } else if (rule === '2') {
          try {
            // 确保关键词输入区域存在
            ensureKeywordsInputExists();
            processedData = checkRule2(processedData, diagnosisColumns);
            limitViolationsByRemaining(processedData, '违规次数_规则2');
          } catch (e) {
            console.error('执行规则2检查时出错:', e);
            alert('执行规则2检查时出错: ' + e.message);
          }
        } else if (rule === '3') {
          processedData = checkRule3(processedData, rehabAssessmentData);
          updateViolationCountsByGroup(processedData, '违规次数_规则3', '身份证号');
        } else if (rule === '5') {
          processedData = checkRule5(processedData);
          updateViolationCountsByGroup(processedData, '违规次数_规则5', '身份证号');
        } else if (rule === '6') {
          processedData = checkRule6(processedData);
          // 直接更新违规次数，不使用updateViolationCountsByGroup
          processedData.forEach(row => {
            if ((row['违规次数_规则6'] || 0) > 0) {
              const violationCount = Math.min(row['违规次数_规则6'], row['剩余可用次数']);
              row['违规次数'] += violationCount;
              row['剩余可用次数'] = Math.max(0, row['剩余可用次数'] - violationCount);
            }
          });
        }
      } else {
        if (rule === '2') {
          try {
            // 确保关键词输入区域存在
            ensureKeywordsInputExists();
            processedData = checkRule2(processedData, diagnosisColumns);
            limitViolationsByRemaining(processedData, '违规次数_规则2');
          } catch (e) {
            console.error('执行规则2检查时出错:', e);
            alert('执行规则2检查时出错: ' + e.message);
          }
        } else if (rule === '4') {
          processedData = checkRule4(processedData);
          limitViolationsByRemaining(processedData, '违规次数_规则4');
        }
      }
      
      // 规则7适用于所有情况
      if (rule === '7' && compareFileData) {
        processedData = checkRule7(processedData, compareFileData);
        limitViolationsByRemaining(processedData, '违规次数_规则7');
      }
    }
    
    // 应用年龄筛选
    applyAgeFilter(processedData, selectedRules);
    
    // 筛选违规数据时添加防护性代码
    let violations = [];
    try {
      violations = (processedData || []).filter(row => {
        if (!row) return false;
        
        // 确保违规次数大于0
        const hasViolations = (row['违规次数'] || 0) > 0;
        
        // 检查是否来自对比文件
        const isFromCompareFile = row['来源'] === '对比文件';
        
        // 检查医保名称条件
        const passesInsuranceCheck = !row['医保名称'] || !row['医保名称'].includes('费');
        
        // 对比文件的行只需要检查违规次数，不需要检查医保名称
        return isFromCompareFile ? hasViolations : (hasViolations && passesInsuranceCheck);
      });
    } catch (error) {
      console.error('筛选违规数据时出错:', error);
      violations = []; // 确保violations是一个数组
    }
    
    // 保存结果
    violationResults = {
      allData: processedData,
      violations: violations,
      selectedRules: selectedRules,
      hasDateColumns: hasDateColumns,
      diagnosisColumns: diagnosisColumns
    };
    
    // 显示结果摘要
    try {
      displayResultsSummary(violations, selectedRules);
    } catch (error) {
      console.error('显示结果摘要时出错:', error);
      alert('处理完成，但显示结果时出错');
    }
  }
  
  /**
   * 应用年龄筛选
   * @param {Array} data - 处理的数据
   * @param {Array} selectedRules - 选中的规则
   */
  function applyAgeFilter(data, selectedRules) {
    if (document.getElementById('ageFilter').checked) {
      const maxAge = parseInt(document.getElementById('filterMaxAge').value);
      if (!isNaN(maxAge)) {
        data.forEach(row => {
          const age = row['患者年龄'];
          if (age !== null && age > maxAge) {
            row['违规次数'] = 0;
            for (const rule of selectedRules) {
              row[`违规次数_规则${rule}`] = 0;
            }
          }
        });
      }
    }
  }
  
  // ==================== 违规规则检查函数 ====================
  
  /**
   * 规则1：每天不超过指定次数
   * @param {Array} data - 处理的数据
   * @returns {Array} - 处理后的数据
   */
  function checkRule1(data) {
    // 获取用户输入的每天最高次数，默认为2
    const maxPerDay = parseInt(document.getElementById('rule1MaxPerDay').value) || 2;
    
    data.forEach(row => {
      if (row['住院天数'] != null) {
        const maxAllowed = (row['住院天数'] + 1) * maxPerDay;
        row['违规次数_规则1'] = Math.max(0, row['次数'] - maxAllowed);
      } else {
        row['违规次数_规则1'] = 0;
      }
    });
    return data;
  };

  /**
   * 规则2：适应症错误
   * @param {Array} data - 处理的数据
   * @param {Array} diagnosisColumns - 诊断列
   * @returns {Array} - 处理后的数据
   */
  function checkRule2(data, diagnosisColumns) {
    console.log("checkRule2函数被调用，传入诊断列:", diagnosisColumns);
    
    // 检查data参数是否有效
    if (!data || !Array.isArray(data)) {
      console.error('checkRule2: 传入的data参数无效', data);
      return Array.isArray(data) ? data : []; 
    }

    // 尝试多种方式获取关键词
    let keywordsInput = '';
    let keywordsElement = null;
    
    // 输出所有可能的关键词输入元素，帮助调试
    console.log("各种可能的关键词输入元素:");
    console.log("- #keywords:", document.getElementById('keywords'));
    console.log("- #keywords_nd:", document.getElementById('keywords_nd'));
    console.log("- #dateBasedRules textarea:", document.querySelector('#dateBasedRules textarea'));
    console.log("- #nonDateBasedRules textarea:", document.querySelector('#nonDateBasedRules textarea'));
    console.log("- #keywordsInput textarea:", document.querySelector('#keywordsInput textarea'));
    console.log("- #keywordsInput_nd textarea:", document.querySelector('#keywordsInput_nd textarea'));
    
    try {
      // 尝试更广泛的选择器来找到关键词输入元素
      if (hasDateColumns) {
        console.log("使用日期列模式查找关键词输入");
        
        // 尝试多种选择器
        keywordsElement = document.getElementById('keywords');
        if (!keywordsElement) keywordsElement = document.querySelector('#dateBasedRules textarea');
        if (!keywordsElement) keywordsElement = document.querySelector('#dateBasedRules #keywordsInput textarea');
        if (!keywordsElement) keywordsElement = document.querySelector('#keywordsInput textarea');
        if (!keywordsElement) keywordsElement = document.querySelector('textarea[id*="keywords"]'); // 部分匹配
        
        // 尝试直接从页面中找到任何可见的textarea
        if (!keywordsElement) {
          const visibleTextareas = Array.from(document.querySelectorAll('textarea'))
            .filter(el => el.offsetParent !== null); // 过滤出可见的textarea
          if (visibleTextareas.length > 0) {
            keywordsElement = visibleTextareas[0];
            console.log("找到可见的textarea:", keywordsElement);
          }
        }
      } else {
        console.log("使用非日期列模式查找关键词输入");
        
        // 尝试多种选择器
        keywordsElement = document.getElementById('keywords_nd');
        if (!keywordsElement) keywordsElement = document.querySelector('#nonDateBasedRules textarea');
        if (!keywordsElement) keywordsElement = document.querySelector('#nonDateBasedRules #keywordsInput_nd textarea');
        if (!keywordsElement) keywordsElement = document.querySelector('#keywordsInput_nd textarea');
        if (!keywordsElement) keywordsElement = document.querySelector('textarea[id*="keywords"]'); // 部分匹配
        
        // 尝试直接从页面中找到任何可见的textarea
        if (!keywordsElement) {
          const visibleTextareas = Array.from(document.querySelectorAll('textarea'))
            .filter(el => el.offsetParent !== null); // 过滤出可见的textarea
          if (visibleTextareas.length > 0) {
            keywordsElement = visibleTextareas[0];
            console.log("找到可见的textarea:", keywordsElement);
          }
        }
      }
      
      // 输出找到的元素信息
      console.log("找到的关键词输入元素:", keywordsElement);
      
      // 如果找不到元素，使用弹出窗口获取关键词
      if (!keywordsElement) {
        console.warn('找不到关键词输入元素，将使用弹出窗口');
        const defaultKeywords = prompt('请输入诊断关键词（用逗号分隔）:', '');
        if (!defaultKeywords || defaultKeywords.trim() === '') {
          throw new Error('请输入关键词');
        }
        keywordsInput = defaultKeywords;
      } else {
        // 如果找到元素，获取其值并检查是否为空
        keywordsInput = keywordsElement.value || '';
        console.log("获取到的关键词输入:", keywordsInput);
        
        if (!keywordsInput || keywordsInput.trim() === '') {
          // 再次尝试通过弹出窗口获取
          const promptKeywords = prompt('请输入诊断关键词（用逗号分隔）:', '');
          if (!promptKeywords || promptKeywords.trim() === '') {
            throw new Error('请输入关键词');
          }
          keywordsInput = promptKeywords;
        }
      }
      
      // 处理关键词
      let keywords = [];
      
      if (keywordsInput && keywordsInput.trim() !== '') {
        // 处理各种可能的分隔符
        if (keywordsInput.includes(',')) {
          keywords = keywordsInput.split(',');
        } else if (keywordsInput.includes('，')) {
          keywords = keywordsInput.split('，');
        } else if (keywordsInput.includes(' ')) {
          keywords = keywordsInput.split(' ');
        } else {
          // 单个关键词
          keywords = [keywordsInput];
        }
        
        // 清理关键词
        keywords = keywords
          .map(keyword => keyword.trim())
          .filter(keyword => keyword.length > 0);
        
        console.log("处理后的关键词列表:", keywords);
        
        if (keywords.length === 0) {
          throw new Error('请输入至少一个有效的关键词');
        }
      } else {
        throw new Error('请输入关键词');
      }
      
      // 遍历数据行
      data.forEach(row => {
        let hasKeyword = false;

        for (const col of diagnosisColumns) {
          if (row[col]) {
            const diagnosis = String(row[col]).toLowerCase();

            // 检查诊断中是否包含任一关键词
            for (const keyword of keywords) {
              if (diagnosis.includes(keyword.toLowerCase())) {
                hasKeyword = true;
                break;
              }
            }
          }
          if (hasKeyword) break;
        }

        // 如果没有找到关键词，则标记为违规
        if (!hasKeyword) {
          row['违规次数_规则2'] = row['次数'];
        } else {
          row['违规次数_规则2'] = 0;
        }
      });

      return data;
    } catch (e) {
      console.error('执行规则2检查时出错:', e);
      alert('执行规则2检查时出错: ' + e.message);
      return Array.isArray(data) ? data : [];
    }
  };
  
  /**
   * 规则3：病程超过1年
   * @param {Array} data - 处理的数据
   * @param {Object} rehabAssessmentData - 康复评定数据
   * @returns {Array} - 处理后的数据
   */
  function checkRule3(data, rehabAssessmentData) {
    const groups = groupBy(data, '身份证号');
    
    data.forEach(row => {
      row['违规次数_规则3'] = 0;
    });
    
    for (const idNum in groups) {
      const group = groups[idNum];
      
      // 获取该身份证号的第一次入院日期
      const earliestAdmission = Math.min(...group.map(row => row['入院日期']));
      const cutoffDate = earliestAdmission + 365 * 24 * 60 * 60 * 1000; // 365天后的时间戳
      
      // 获取该身份证号的所有康复评定日期
      const rehabDates = rehabAssessmentData ? rehabAssessmentData[idNum] : null;
      
      // 计算365天后入院的违规次数
      group.forEach(row => {
        if (row['入院日期'] > cutoffDate) {
          let shouldMarkViolation = true;
          
          if (rehabDates) {
            // 找到365天后的第一次康复评定日期
            let firstRehabAfter365 = null;
            for (const date of rehabDates) {
              if (date > cutoffDate) {
                firstRehabAfter365 = date;
                break;
              }
            }
            
            if (firstRehabAfter365 !== null && row['入院日期'] > firstRehabAfter365) {
              shouldMarkViolation = false;
            }
          }
          
          if (shouldMarkViolation) {
            row['违规次数_规则3'] = row['次数'];
          }
        }
        
        // 计算跨365天的违规次数
        if (row['入院日期'] <= cutoffDate && row['出院日期'] > cutoffDate) {
          let shouldMarkViolation = true;
          
          if (rehabDates) {
            // 检查入院日期后是否有康复评定
            for (const date of rehabDates) {
              if (date > row['入院日期']) {
                shouldMarkViolation = false;
                break;
              }
            }
          }
          
          if (shouldMarkViolation) {
            row['违规次数_规则3'] = row['次数'];
          }
        }
      });
    }
    
    return data;
  }
  
  /**
   * 规则4：单天次数大于5
   * @param {Array} data - 处理的数据
   * @returns {Array} - 处理后的数据
   */
  function checkRule4(data) {
    data.forEach(row => {
      row['违规次数_规则4'] = Math.max(0, row['次数'] - 5);
    });
    return data;
  }
  
 /**
 * 规则5：病程内总次数超过4
 */
function checkRule5(data) {
    const groups = groupBy(data, '身份证号');
    
    data.forEach(row => {
      row['违规次数_规则5'] = 0;
    });
    
    for (const idNum in groups) {
      const group = groups[idNum];
      
      // 计算总次数
      const totalCount = group.reduce((sum, row) => sum + row['次数'], 0);
      
      if (totalCount > 4) {
        // 计算超出4次的违规数量
        const violationCount = totalCount - 4;
        
        // 从最后一条记录开始回溯分配违规次数
        let remaining = violationCount;
        const sortedGroup = [...group].sort((a, b) => b['入院日期'] - a['入院日期']); // 倒序处理
        
        for (const row of sortedGroup) {
          if (remaining <= 0) break;
          
          const currentCount = Math.min(remaining, row['次数']);
          row['违规次数_规则5'] = currentCount;
          remaining -= currentCount;
        }
      }
    }
    
    return data;
  }
  
  /**
   * 规则6：月次数限制（每30天不超过1次，每年不超过12次）
   * @param {Array} data - 处理的数据
   * @returns {Array} - 处理后的数据
   */
  function checkRule6(data) {
    const groups = groupBy(data, '身份证号');
    
    data.forEach(row => {
      row['违规次数_规则6'] = 0;
    });
    
    for (const idNum in groups) {
      const group = groups[idNum];
      
      // 计算最早入院日期和截止日期
      const earliestAdmission = Math.min(...group.map(row => row['入院日期']));
      const cutoffDate = earliestAdmission + 365 * 24 * 60 * 60 * 1000; // 365天后的时间戳
      
      // 计算30天违规（向上取整，且保证最小值为1）
      group.forEach(row => {
        const admissionDate = row['入院日期'];
        const dischargeDate = row['出院日期'];
        
        if (admissionDate && dischargeDate) {
          const stayDays = Math.floor((dischargeDate - admissionDate) / (24 * 60 * 60 * 1000));
          row['住院天数'] = stayDays;
          // 计算30天违规次数
          row['违规次数_规则6'] = Math.max(0, row['次数'] - Math.max(1, Math.ceil(stayDays / 30)));
        }
      });
      
      // 计算年度违规
      const totalOccurrences = group.reduce((sum, row) => sum + row['次数'], 0);
      
      if (totalOccurrences > 12) {
        // 计算需要额外标记的违规次数
        const extraViolations = totalOccurrences - 12;
        
        // 按入院日期从晚到早排序
        const sortedGroup = [...group].sort((a, b) => b['入院日期'] - a['入院日期']);
        
        // 从最晚的入院记录开始标记违规
        let remainingViolations = extraViolations;
        
        for (const row of sortedGroup) {
          if (remainingViolations <= 0) break;
          
          // 获取当前行的30天违规次数
          const thirtyDayViolations = row['违规次数_规则6'];
          
          // 计算这条记录还可以标记的违规次数
          const availableViolations = row['次数'] - thirtyDayViolations;
          
          if (availableViolations > 0) {
            // 标记违规
            const violationsToAdd = Math.min(remainingViolations, availableViolations);
            row['违规次数_规则6'] = thirtyDayViolations + violationsToAdd;
            remainingViolations -= violationsToAdd;
          }
        }
      }
    }
    
    return data;
  }
  
  /**
   * 规则7：项目重复
   * @param {Array} data - 处理的数据
   * @param {Array} compareData - 对比数据
   * @returns {Array} - 处理后的数据
   */
  function checkRule7(data, compareData) {
    console.log("开始执行规则7检查");
    console.log("当前数据行数:", data.length);
    console.log("对比数据行数:", compareData.length);
    
    // 检查数据有效性
    if (!Array.isArray(data) || !Array.isArray(compareData)) {
      console.error("数据无效:", { data: typeof data, compareData: typeof compareData });
      return data; // 返回原始数据，避免处理错误
    }
    
    // 检查数据中是否有中心流水号
    const hasFlowId = data.length > 0 && '中心流水号' in data[0];
    const compareHasFlowId = compareData.length > 0 && '中心流水号' in compareData[0];
    
    if (!hasFlowId || !compareHasFlowId) {
      console.error("数据中缺少中心流水号字段:", { hasFlowId, compareHasFlowId });
      return data;
    }
    
    // 获取重复的中心流水号
    const dataIds = new Set(data.filter(row => row && row['中心流水号']).map(row => row['中心流水号']));
    const compareIds = new Set(compareData.filter(row => row && row['中心流水号']).map(row => row['中心流水号']));
    
    console.log("当前数据中的流水号数量:", dataIds.size);
    console.log("对比数据中的流水号数量:", compareIds.size);
    
    // 使用Array.from而不是展开运算符，更安全
    const duplicateIds = Array.from(dataIds).filter(id => compareIds.has(id));
    
    console.log(`找到 ${duplicateIds.length} 个重复的中心流水号:`, duplicateIds);
    
    // 如果没有重复的流水号，直接返回
    if (duplicateIds.length === 0) {
      return data;
    }
    
    // 计算每个重复流水号在两个sheet中的总金额
    const flowIdAmounts = {};
    
    // 计算当前sheet中每个流水号的总金额
    duplicateIds.forEach(flowId => {
      if (!flowId) {
        console.warn("跳过无效的流水号");
        return;
      }
      
      const rowsWithFlowId = data.filter(row => row && row['中心流水号'] === flowId);
      console.log(`流水号 ${flowId} 在当前文件中找到 ${rowsWithFlowId.length} 行`);
      
      const totalAmount = rowsWithFlowId.reduce((sum, row) => {
        const count = parseInt(row['次数'] || 0);
        const price = parseFloat(row['单价'] || 0);
        return sum + (count * price);
      }, 0);
      
      flowIdAmounts[flowId] = {
        currentSheet: totalAmount,
        currentSheetRows: rowsWithFlowId
      };
      
      console.log(`流水号 ${flowId} 在当前文件中的总金额: ${totalAmount}`);
    });
    
    // 计算对比sheet中每个流水号的总金额
    duplicateIds.forEach(flowId => {
      if (!flowId || !flowIdAmounts[flowId]) {
        console.warn(`跳过无效的流水号或未找到的流水号: ${flowId}`);
        return;
      }
      
      const rowsWithFlowId = compareData.filter(row => row && row['中心流水号'] === flowId);
      console.log(`流水号 ${flowId} 在对比文件中找到 ${rowsWithFlowId.length} 行`);
      
      const totalAmount = rowsWithFlowId.reduce((sum, row) => {
        const count = parseInt(row['次数'] || 0);
        const price = parseFloat(row['单价'] || 0);
        return sum + (count * price);
      }, 0);
      
      flowIdAmounts[flowId].compareSheet = totalAmount;
      flowIdAmounts[flowId].compareSheetRows = rowsWithFlowId;
      
      console.log(`流水号 ${flowId} 在对比文件中的总金额: ${totalAmount}`);
    });
    
    // 根据总金额比较，决定哪些流水号在当前sheet中应该被标记为违规
    const currentSheetViolationIds = [];
    const compareSheetViolationRows = [];
    
    // 检查flowIdAmounts是否为空
    if (Object.keys(flowIdAmounts).length === 0) {
      console.warn("没有有效的流水号金额数据");
      return data;
    }
    
    for (const flowId of Object.keys(flowIdAmounts)) {
      const amounts = flowIdAmounts[flowId];
      
      // 检查必要的属性是否存在
      if (!amounts || typeof amounts !== 'object') {
        console.warn(`流水号 ${flowId} 的金额数据无效`);
        continue;
      }
      
      if (amounts.currentSheet === undefined || amounts.compareSheet === undefined) {
        console.warn(`流水号 ${flowId} 缺少金额数据:`, amounts);
        continue;
      }
      
      console.log(`比较流水号 ${flowId}: 当前文件金额 ${amounts.currentSheet} vs 对比文件金额 ${amounts.compareSheet}`);
      
      if (amounts.currentSheet <= amounts.compareSheet) {
        // 当前sheet的金额小于或等于对比sheet的金额，标记当前sheet为违规
        currentSheetViolationIds.push(flowId);
        console.log(`流水号 ${flowId}: 当前文件被标记为违规`);
      } else {
        // 当前sheet的金额大于对比sheet的金额，标记对比sheet为违规
        if (!Array.isArray(amounts.compareSheetRows)) {
          console.warn(`流水号 ${flowId} 的对比文件行数据无效:`, amounts.compareSheetRows);
          continue;
        }
        
        // 在处理对比文件数据前，先计算患者年龄
        compareData.forEach(row => {
          if (!row) return;
          
          // 获取就诊日期
          let visitDate;
          if (row['入院日期']) {
            visitDate = row['入院日期'];
          } else if (row['挂号日期']) {
            visitDate = String(row['挂号日期']);
            
            // 处理数字格式的日期
            if (!isNaN(visitDate) && visitDate.length === 8) {
              const year = visitDate.substring(0, 4);
              const month = visitDate.substring(4, 6);
              const day = visitDate.substring(6, 8);
              visitDate = `${year}-${month}-${day}`;
            }
          }
          
          // 计算年龄并存储
          row['患者年龄'] = calculateAge(row['身份证号'], visitDate);
        });
        
        // 将对比sheet中的违规行添加到结果中
        const violationRows = amounts.compareSheetRows.map(row => {
          if (!row) {
            console.warn("跳过无效的行数据");
            return null;
          }
          
          // 复制行并添加必要的标记
          const newRow = {...row};
          newRow['违规次数_规则7'] = parseInt(newRow['次数'] || 0);
          newRow['违规次数'] = parseInt(newRow['次数'] || 0); // 同时设置总违规次数
          newRow['剩余可用次数'] = 0; // 确保没有剩余可用次数
          newRow['来源'] = '对比文件';  // 添加来源标记
          
          // 确保患者年龄已计算
          if (newRow['患者年龄'] === undefined) {
            let visitDate;
            if (newRow['入院日期']) {
              visitDate = newRow['入院日期'];
            } else if (newRow['挂号日期']) {
              visitDate = String(newRow['挂号日期']);
              if (!isNaN(visitDate) && visitDate.length === 8) {
                const year = visitDate.substring(0, 4);
                const month = visitDate.substring(4, 6);
                const day = visitDate.substring(6, 8);
                visitDate = `${year}-${month}-${day}`;
              }
            }
            newRow['患者年龄'] = calculateAge(newRow['身份证号'], visitDate);
          }
          
          return newRow;
        }).filter(row => row !== null); // 过滤掉无效行
        
        compareSheetViolationRows.push(...violationRows);
        console.log(`流水号 ${flowId}: 对比文件被标记为违规，添加 ${violationRows.length} 行`);
      }
    }
    
    // 标记当前sheet中的违规
    data.forEach(row => {
      if (!row) return;
      
      const flowId = row['中心流水号'];
      if (!flowId) {
        row['违规次数_规则7'] = 0;
        return;
      }
      
      // 如果流水号在重复列表中
      if (duplicateIds.includes(flowId)) {
        if (currentSheetViolationIds.includes(flowId)) {
          // 当前sheet金额较小，标记为违规，违规次数等于原始次数
          row['违规次数_规则7'] = parseInt(row['次数'] || 0);
        } else {
          // 当前sheet金额较大，不标记为违规
          row['违规次数_规则7'] = 0;
        }
      } else {
        // 不是重复流水号，不标记为违规
        row['违规次数_规则7'] = 0;
      }
      
      // 为当前sheet的数据添加来源标记
      row['来源'] = '当前文件';
    });
    
    console.log(`当前文件中被标记为违规的流水号数: ${currentSheetViolationIds.length}`);
    console.log(`对比文件中被标记为违规的行数: ${compareSheetViolationRows.length}`);
    
    // 检查对比文件中的违规行
    if (compareSheetViolationRows.length > 0) {
      console.log("对比文件中的第一个违规行示例:", compareSheetViolationRows[0]);
    }
    
    // 将对比sheet中的违规行添加到结果中
    const result = [...data, ...compareSheetViolationRows];
    console.log("合并后的总行数:", result.length);
    
    return result;
  }
  
  // ==================== 违规统计辅助函数 ====================
  
  /**
   * 更新违规次数
   * @param {Array} data - 处理的数据
   * @param {string} violationField - 违规字段名
   */
  function updateViolationCounts(data, violationField) {
    data.forEach(row => {
      if (row[violationField] > 0) {
        row['违规次数'] += row[violationField];
        row['剩余可用次数'] = Math.max(0, row['剩余可用次数'] - row[violationField]);
      }
    });
  }
  
  /**
   * 按剩余可用次数限制违规次数
   * @param {Array} data - 处理的数据
   * @param {string} violationField - 违规字段名
   */
  function limitViolationsByRemaining(data, violationField) {
    // 添加防护性检查
    if (!data || !Array.isArray(data)) {
      console.error('limitViolationsByRemaining: data 参数无效', data);
      return; // 提前返回，避免错误
    }

    data.forEach(row => {
      if (!row) return;
      
      // 对于来自对比文件的行，直接使用违规次数，不需要限制
      if (row['来源'] === '对比文件') {
        if ((row[violationField] || 0) > 0) {
          row['违规次数'] = row[violationField];
        }
        return;
      }
      
      // 对于当前文件的行，按原逻辑处理
      if ((row[violationField] || 0) > 0) {
        const violationCount = Math.min(row[violationField] || 0, row['剩余可用次数'] || 0);
        row['违规次数'] += violationCount;
        row['剩余可用次数'] = Math.max(0, (row['剩余可用次数'] || 0) - violationCount);
      }
    });
  }
  
  /**
   * 按组更新违规次数
   * @param {Array} data - 处理的数据
   * @param {string} violationField - 违规字段名
   * @param {string} groupField - 分组字段名
   */
  function updateViolationCountsByGroup(data, violationField, groupField) {
    const groups = groupBy(data, groupField);
    
    for (const groupId in groups) {
      const group = groups[groupId];
      let totalViolations = group.reduce((sum, row) => sum + (row[violationField] || 0), 0);
      
      // 按剩余可用次数分配违规次数
      for (const row of group) {
        if (totalViolations <= 0) break;
        
        // 确保违规次数不超过原始次数
        const maxViolations = Math.min(row[violationField] || 0, row['次数'] || 0);
        
        // 计算可以添加到总违规次数的数量
        const currentViolations = Math.min(maxViolations, row['剩余可用次数'] || 0);
        
        if (currentViolations > 0) {
          row['违规次数'] += currentViolations;
          row['剩余可用次数'] = Math.max(0, (row['剩余可用次数'] || 0) - currentViolations);
          totalViolations -= currentViolations;
        }
      }
    }
  }
  
  // ==================== 结果显示函数 ====================
  
  /**
   * 显示结果摘要
   * @param {Array} violations - 违规数据
   * @param {Array} selectedRules - 选中的规则
   */
  function displayResultsSummary(violations, selectedRules) {
    // 清除处理状态信息
    const processingStatus = document.getElementById('processingStatus');
    if (processingStatus) {
      processingStatus.innerHTML = '';
      processingStatus.style.display = 'none'; // 隐藏处理状态区域
    }
    
    const summary = document.getElementById('violationSummary');
    
    console.log("显示结果摘要，违规数据行数:", violations.length);
    console.log("其中来自对比文件的行数:", 
      violations.filter(row => row['来源'] === '对比文件').length);
    
    if (violations.length === 0) {
      summary.innerHTML = '<p>未发现违规数据</p>';
      return;
    }
    
    // 计算违规次数和金额总和
    let totalViolationCount = 0;
    let totalViolationAmount = 0;
    
    violations.forEach(row => {
      if (!row) return;
      
      const violationCount = Math.min(row['违规次数'] || 0, row['次数'] || 0);
      totalViolationCount += violationCount;
      
      const price = parseFloat(row['单价'] || 0);
      totalViolationAmount += price * violationCount;
    });
    
    // 格式化金额，保留两位小数
    const formattedAmount = totalViolationAmount.toFixed(2);
    
    let html = `
      <p>发现 ${violations.length} 条违规数据</p>
      <p>违规次数总和: ${totalViolationCount} 次</p>
      <p>违规金额总和: ${formattedAmount} 元</p>
    `;
    
    summary.innerHTML = html;
    
    // 显示所有操作按钮
    const buttons = ['showDetailsButton', 'analyzeButton', 'downloadButton', 'continueButton'];
    buttons.forEach(id => {
      const button = document.getElementById(id);
      if (button) {
        button.style.display = 'inline-flex';
      }
    });
    
    // 如果违规金额大于0，保存检查记录
    if (totalViolationAmount > 0) {
      saveCheckRecord(violations, totalViolationCount, formattedAmount, selectedRules);
    }
  }
  
  /**
   * 显示违规详情
   */
  function showViolationDetails() {
    if (!violationResults) return;
    
    const detailsDiv = document.getElementById('violationDetails');
    const contentDiv = document.getElementById('violationDetailsContent');
    const violations = violationResults.violations;
    const selectedRules = violationResults.selectedRules;
    
    let html = '';
    
    // 如果选择了多个规则，添加规则选择区域，并设置为固定定位
    if (selectedRules.length > 1) {
      html += `
        <div class="rule-selector-container" style="position: sticky; top: 0; background-color: white; padding: 10px; z-index: 100; border-bottom: 1px solid #ddd;">
          <div class="rule-selector">
            <label>选择要查看的规则：</label>
            <select id="ruleSelector" onchange="changeViolationView()">
              <option value="summary">违规汇总</option>
              ${selectedRules.map(rule => `<option value="${rule}">规则${rule}</option>`).join('')}
            </select>
          </div>
        </div>
      `;
    }
    
    // 添加表格容器
    html += '<div id="violationTableContainer"></div>';
    
    contentDiv.innerHTML = html;
    detailsDiv.style.display = 'block';
    
    // 显示所有操作按钮
    document.getElementById('downloadButton').style.display = 'inline-flex';
    document.getElementById('continueButton').style.display = 'inline-flex';
    
    // 显示初始视图
    if (selectedRules.length > 1) {
      showViolationTable('summary');
    } else {
      showViolationTable(selectedRules[0]);
    }
  }
  
  /**
   * 切换违规视图
   */
  function changeViolationView() {
    const selector = document.getElementById('ruleSelector');
    if (selector) {
      showViolationTable(selector.value);
    }
  }
  
  /**
   * 显示违规表格
   * @param {string} viewType - 视图类型
   */
  function showViolationTable(viewType) {
    if (!violationResults) return;
    
    const container = document.getElementById('violationTableContainer');
    const violations = violationResults.violations;
    const selectedRules = violationResults.selectedRules;
    const allData = violationResults.allData;
    
    // 定义需要排除的列
    const excludeColumns = ['违规', '剩余可用次数', '30天违规'];
    
    // 确定是否包含"来源"列
    const includeSource = selectedRules.includes('7');
    
    // 获取原始数据中的所有非空列
    const nonEmptyColumns = new Set();
    
    // 从所有数据中找出非空列
    allData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (row[key] !== null && row[key] !== undefined && row[key] !== '' && 
            !excludeColumns.includes(key) && 
            !key.startsWith('违规次数_规则') &&
            (includeSource || key !== '来源')) {
          nonEmptyColumns.add(key);
        }
      });
    });
    
    // 定义固定的列顺序
    const priorityColumns = includeSource ? 
      ['来源', '姓名', '患者年龄', '次数', '单价'] : 
      ['姓名', '患者年龄', '次数', '单价'];
    
    let headers, rows;
    
    if (viewType === 'summary') {
      // 汇总视图
      // 先添加优先列
      headers = [...priorityColumns.filter(col => nonEmptyColumns.has(col) || col === '违规次数')];
      
      // 添加违规次数列
      if (!headers.includes('违规次数')) {
        headers.push('违规次数');
      }
      
      // 添加其他非空列（排除已添加的列）
      Array.from(nonEmptyColumns)
        .filter(col => !headers.includes(col) && col !== '来源')
        .sort() // 按字母顺序排序其他列
        .forEach(col => headers.push(col));
      
      // 添加各规则的违规次数列
      selectedRules.forEach(rule => {
        headers.push(`违规次数_规则${rule}`);
      });
      
      rows = violations.map(row => {
        const newRow = {...row};
        newRow['违规次数'] = Math.min(row['违规次数'] || 0, row['次数'] || 0);
        if (includeSource && !newRow['来源']) newRow['来源'] = '当前文件';

        // 格式化日期显示
      if (newRow['入院日期']) newRow['入院日期'] = formatDateToYYYYMMDD(newRow['入院日期']);
      if (newRow['出院日期']) newRow['出院日期'] = formatDateToYYYYMMDD(newRow['出院日期']);

        return newRow;
      });
    } else {
      // 单个规则视图
      // 先添加优先列
      headers = [...priorityColumns.filter(col => nonEmptyColumns.has(col) || col === '违规次数')];
      
      // 添加违规次数列
      if (!headers.includes('违规次数')) {
        headers.push('违规次数');
      }
      
      // 添加其他非空列（排除已添加的列）
      Array.from(nonEmptyColumns)
        .filter(col => !headers.includes(col) && col !== '来源')
        .sort() // 按字母顺序排序其他列
        .forEach(col => headers.push(col));
      
      rows = violations.map(row => {
        const newRow = {...row};
        newRow['违规次数'] = row[`违规次数_规则${viewType}`] || 0;
        
        // 删除其他违规次数相关的列
        Object.keys(newRow).forEach(key => {
          if (key.startsWith('违规次数_规则')) delete newRow[key];
        });

        // 格式化日期显示
      if (newRow['入院日期']) newRow['入院日期'] = formatDateToYYYYMMDD(newRow['入院日期']);
      if (newRow['出院日期']) newRow['出院日期'] = formatDateToYYYYMMDD(newRow['出院日期']);
        
        if (includeSource && !newRow['来源']) newRow['来源'] = '当前文件';
        return newRow;
      }).filter(row => row['违规次数'] > 0);
    }
    
    // 构建表格HTML
    let html = '<table><thead><tr>';
    
    // 添加表头
    headers.forEach(header => {
      let displayHeader = header;
      if (header.startsWith('违规次数_规则')) {
        const ruleNum = header.split('规则')[1];
        displayHeader = ruleNum === '7' ? '项目重复违规次数' : `规则${ruleNum}违规次数`;
      }
      html += `<th>${displayHeader}</th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    // 添加数据行
    rows.forEach(row => {
      html += '<tr>';
      headers.forEach(header => {
        const value = row[header] ?? '';
        html += `<td>${value}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    container.innerHTML = html;
  }
  
  // ==================== 记录管理函数 ====================
  
  /**
   * 保存检查记录
   * @param {Array} violations - 违规数据
   * @param {number} totalViolationCount - 总违规次数
   * @param {string|number} totalAmount - 总违规金额
   * @param {Array} selectedRules - 选中的规则
   */
  function saveCheckRecord(violations, totalViolationCount, totalAmount, selectedRules) {
    try {
      // 检查参数
      if (!Array.isArray(violations) || !selectedRules) {
        console.error('保存检查记录参数无效:', { 
          violations: Array.isArray(violations), 
          totalViolationCount: typeof totalViolationCount,
          totalAmount: typeof totalAmount,
          selectedRules: Array.isArray(selectedRules)
        });
        return;
      }
      
      // 确保totalViolationCount是数字
      totalViolationCount = parseInt(totalViolationCount) || 0;
      
      // 获取当前时间作为记录ID
      const recordId = Date.now();
      const timestamp = new Date().toLocaleString();
      
      // 获取文件名和sheet名称
      const fileName = document.getElementById('fileInput').files[0]?.name || '未知文件';
      const sheetName = selectedSheet || '';
      
      // 创建格式化的文件名：输入文件名-sheet名称
      const formattedFileName = sheetName ? `${fileName}-${sheetName}` : fileName;
      
      // 创建记录对象
      const record = {
        id: recordId,
        timestamp: timestamp,
        totalCount: totalViolationCount,
        totalAmount: totalAmount,
        selectedRules: selectedRules,
        violations: violations,
        fileName: formattedFileName
      };
      
      // 从localStorage获取现有记录
      let records = JSON.parse(localStorage.getItem('checkRecords')) || [];
      
      // 添加新记录
      records.push(record);
      
      // 限制记录数量，最多保存最近的20条记录
      if (records.length > 20) {
        records = records.slice(records.length - 20);
      }
      
      // 保存回localStorage
      try {
        localStorage.setItem('checkRecords', JSON.stringify(records));
      } catch (e) {
        console.error('保存检查记录失败:', e);
        // 如果数据太大导致保存失败，尝试只保存摘要信息
        if (e.name === 'QuotaExceededError') {
          const simplifiedRecord = {
            id: record.id,
            timestamp: record.timestamp,
            totalCount: totalViolationCount,
            totalAmount: record.totalAmount,
            selectedRules: record.selectedRules,
            violationsCount: violations.length,
            fileName: formattedFileName
          };
          
          records[records.length - 1] = simplifiedRecord;
          try {
            localStorage.setItem('checkRecords', JSON.stringify(records));
          } catch (e2) {
            console.error('保存简化检查记录也失败:', e2);
          }
        }
      }
    } catch (error) {
      console.error('保存检查记录时出错:', error);
    }
  }
  
  /**
   * 显示检查记录
   */
  function showCheckRecords() {
    // 隐藏主页面内容
    document.getElementById('mainContent').style.display = 'none';
    
    // 显示检查记录页面
    const recordsContainer = document.getElementById('checkRecordsContainer');
    recordsContainer.style.display = 'block';
    
    // 获取检查记录
    const records = JSON.parse(localStorage.getItem('checkRecords')) || [];
    
    if (records.length === 0) {
      recordsContainer.innerHTML = `
        <div class="records-header">
          <h2>检查记录</h2>
          <div class="records-actions">
            <button onclick="returnToHomepage()" class="home-button">返回主页</button>
            <button onclick="hideCheckRecords()" class="back-button">返回</button>
          </div>
        </div>
        <p>暂无检查记录</p>
      `;
      return;
    }
    
    // 按时间倒序排列记录
    records.sort((a, b) => b.id - a.id);
    
    // 构建记录列表HTML
    let html = `
      <div class="records-header">
        <h2>检查记录</h2>
        <div class="records-actions">
          <button id="deleteSelectedRecords" class="delete-button" onclick="deleteSelectedRecords()">删除选中</button>
          <button onclick="returnToHomepage()" class="home-button">返回主页</button>
          <button onclick="hideCheckRecords()" class="back-button">返回</button>
        </div>
      </div>
      <div class="records-list">
    `;
    
    records.forEach(record => {
      const formattedAmount = parseFloat(record.totalAmount).toFixed(2);
      
      html += `
        <div class="record-item">
          <div class="record-checkbox">
            <input type="checkbox" class="record-select" data-id="${record.id}">
          </div>
          <div class="record-summary" onclick="showRecordDetail(${record.id})">
            <div class="record-time">${record.timestamp}</div>
            <div class="record-file">${record.fileName}</div>
            <div class="record-stats">
              <span>违规次数: ${record.totalCount}</span>
              <span>违规金额: ${formattedAmount} 元</span>
            </div>
          </div>
          <div class="record-arrow">›</div>
        </div>
      `;
    });
    
    html += `</div>`;
    
    recordsContainer.innerHTML = html;
  }
  
  /**
   * 显示记录详情
   * @param {number} recordId - 记录ID
   */
  function showRecordDetail(recordId) {
    // 获取检查记录
    const records = JSON.parse(localStorage.getItem('checkRecords')) || [];
    const record = records.find(r => r.id === recordId);
    
    if (!record) {
      alert('未找到记录详情');
      return;
    }
    
    // 隐藏记录列表
    document.getElementById('checkRecordsContainer').style.display = 'none';
    
    // 显示记录详情页面
    const detailContainer = document.getElementById('recordDetailContainer');
    detailContainer.style.display = 'block';
    
    // 格式化金额
    const formattedAmount = parseFloat(record.totalAmount).toFixed(2);
    
    // 构建详情页HTML
    let html = `
      <div class="records-header">
        <h2>检查记录详情</h2>
        <div class="records-actions">
          <button onclick="returnToHomepage()" class="home-button">返回主页</button>
          <button onclick="backToRecordsList()" class="back-button">返回</button>
        </div>
      </div>
      <div class="record-detail-info">
        <p><strong>检查时间:</strong> ${record.timestamp}</p>
        <p><strong>文件名:</strong> ${record.fileName}</p>
        <p><strong>违规次数总和:</strong> ${record.totalCount} 次</p>
        <p><strong>违规金额总和:</strong> ${formattedAmount} 元</p>
        <p><strong>应用规则:</strong> ${record.selectedRules.map(rule => 
          rule === '7' ? '项目重复' : `规则${rule}`
        ).join(', ')}</p>
      </div>
    `;
    
    // 如果有详细违规数据，显示表格
    if (record.violations && Array.isArray(record.violations)) {
      html += `
        <div class="violations-table-container">
          <h3>违规数据明细</h3>
          <table class="violations-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>患者年龄</th>
                <th>身份证号</th>
                <th>中心流水号</th>
                <th>入院日期</th>
                <th>出院日期</th>
                <th>违规次数</th>
                <th>单价</th>
                <th>违规金额</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      record.violations.forEach(violation => {
        const violationCount = Math.min(violation['违规次数'], violation['次数']);
        const price = parseFloat(violation['单价']) || 0;
        const amount = (price * violationCount).toFixed(2);
        const admissionDate = formatDateToYYYYMMDD(violation['入院日期']);
        const dischargeDate = formatDateToYYYYMMDD(violation['出院日期']);
        
        html += `
          <tr>
            <td>${violation['姓名'] || '-'}</td>
            <td>${violation['患者年龄'] || '-'}</td>
            <td>${violation['身份证号'] || '-'}</td>
            <td>${violation['中心流水号'] || '-'}</td>
            <td>${admissionDate || '-'}</td>
            <td>${dischargeDate || '-'}</td>
            <td>${violationCount}</td>
            <td>${price.toFixed(2)}</td>
            <td>${amount}</td>
          </tr>
        `;
      });
      
      html += `
            </tbody>
          </table>
        </div>
      `;
    } else {
      html += `<p>详细违规数据不可用</p>`;
    }
    
    detailContainer.innerHTML = html;
  }
  
  /**
   * 删除选中的记录
   */
  function deleteSelectedRecords() {
    // 获取所有选中的记录ID
    const selectedCheckboxes = document.querySelectorAll('.record-select:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.getAttribute('data-id')));
    
    if (selectedIds.length === 0) {
      alert('请至少选择一条记录进行删除');
      return;
    }
    
    if (confirm(`确定要删除选中的 ${selectedIds.length} 条记录吗？`)) {
      // 获取当前记录
      let records = JSON.parse(localStorage.getItem('checkRecords')) || [];
      
      // 过滤掉选中的记录
      records = records.filter(record => !selectedIds.includes(record.id));
      
      // 保存回localStorage
      localStorage.setItem('checkRecords', JSON.stringify(records));
      
      // 刷新记录列表
      showCheckRecords();
    }
  }
  
  // ==================== 功能按钮函数 ====================
  
  /**
 * 下载结果
 */
function downloadResults() {
  if (!violationResults) return;
  
  try {
    // 创建一个新的工作簿
    const wb = XLSX.utils.book_new();
    
    // 获取当前选中的视图类型
    const selector = document.getElementById('ruleSelector');
    const viewType = selector ? selector.value : violationResults.selectedRules[0];
    
    // 处理数据
    const violations = violationResults.violations;
    const selectedRules = violationResults.selectedRules;
    const allData = violationResults.allData;
    
    // 定义需要排除的列
    const excludeColumns = ['违规', '剩余可用次数', '30天违规'];
    
    // 确定是否包含"来源"列
    const includeSource = selectedRules.includes('7');
    
    // 获取原始数据中的所有非空列
    const nonEmptyColumns = new Set();
    
    // 从所有数据中找出非空列
    allData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (row[key] !== null && row[key] !== undefined && row[key] !== '' && 
            !excludeColumns.includes(key) && 
            !key.startsWith('违规次数_规则') &&
            (includeSource || key !== '来源')) {
          nonEmptyColumns.add(key);
        }
      });
    });
    
    // 定义固定的列顺序
    const priorityColumns = includeSource ? 
      ['来源', '姓名', '患者年龄', '次数', '违规次数', '单价'] : 
      ['姓名', '患者年龄', '次数', '违规次数', '单价'];
    
    let headers, processedData;
    
    if (viewType === 'summary') {
      // 汇总视图
      // 先添加优先列
      headers = [...priorityColumns.filter(col => nonEmptyColumns.has(col) || col === '违规次数')];
      
      // 添加违规次数列
      if (!headers.includes('违规次数')) {
        headers.push('违规次数');
      }
      
      // 添加其他非空列（排除已添加的列）
      Array.from(nonEmptyColumns)
        .filter(col => !headers.includes(col) && col !== '来源')
        .sort() // 按字母顺序排序其他列
        .forEach(col => headers.push(col));
      
      // 添加各规则的违规次数列
      selectedRules.forEach(rule => {
        headers.push(`规则${rule}违规次数`);
      });
      
      processedData = violations.map(row => {
        const newRow = {};
        headers.forEach(header => {
          if (header.startsWith('规则') && header.endsWith('违规次数')) {
            const ruleNum = header.match(/\d+/)[0];
            newRow[header] = row[`违规次数_规则${ruleNum}`] || 0;
          } else {
            // 格式化日期列
            if ((header === '入院日期' || header === '出院日期') && row[header]) {
              newRow[header] = formatDateToYYYYMMDD(row[header]);
            } else {
              newRow[header] = row[header];
            }
          }
        });

      // 确保违规次数不超过实际次数
        newRow['违规次数'] = Math.min(row['违规次数'] || 0, row['次数'] || 0);
        if (includeSource && !newRow['来源']) newRow['来源'] = '当前文件';
        return newRow;
      });
    } else {
      // 单个规则视图
      // 先添加优先列
      headers = [...priorityColumns.filter(col => nonEmptyColumns.has(col) || col === '违规次数')];
      
      // 添加违规次数列
      if (!headers.includes('违规次数')) {
        headers.push('违规次数');
      }
      
      // 添加其他非空列（排除已添加的列）
      Array.from(nonEmptyColumns)
        .filter(col => !headers.includes(col) && col !== '来源')
        .sort() // 按字母顺序排序其他列
        .forEach(col => headers.push(col));
      
     processedData = violations
        .map(row => {
          const newRow = {};
          headers.forEach(header => {
            // 格式化日期列
            if ((header === '入院日期' || header === '出院日期') && row[header]) {
              newRow[header] = formatDateToYYYYMMDD(row[header]);
            } else {
              newRow[header] = row[header];
            }
          });
          newRow['违规次数'] = row[`违规次数_规则${viewType}`] || 0;
          if (includeSource && !newRow['来源']) newRow['来源'] = '当前文件';
          return newRow;
        })
        .filter(row => row['违规次数'] > 0);
    }
    
    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(processedData);
    XLSX.utils.book_append_sheet(wb, ws, '违规数据');
    
    // 获取原始文件名并获取新文件名
    const originalFileName = document.getElementById('fileInput').files[0]?.name || '未知文件';
    const baseFileName = originalFileName.replace(/\.[^/.]+$/, ""); // 移除扩展名
    const newFileName = `${baseFileName}违规报告.xlsx`;
    
    // 保存文件
    XLSX.writeFile(wb, newFileName);
  } catch (error) {
    console.error('下载过程中出错:', error);
    alert('下载失败: ' + error.message);
  }
}
  
  /**
   * 重置页面
   */
  function resetPage() {
    try {
      // 重置所有全局变量
      workbook = null;
      selectedSheet = null;
      sheetData = null;
      hasDateColumns = false;
      diagnosisColumns = [];
      violationResults = null;
      rehabAssessmentData = null;
      compareFileData = null;
      
      // 重置文件输入
      document.getElementById('fileInput').value = '';
      
      // 尝试重置其他文件输入
      const rehabFileInput = document.getElementById('rehabFileInput');
      if (rehabFileInput) rehabFileInput.value = '';
      
      const compareFileInput = document.getElementById('commonCompareFileInput');
      if (compareFileInput) compareFileInput.value = '';
      
      // 隐藏所有结果相关的区域
      document.getElementById('sheetSelector').style.display = 'none';
      document.getElementById('rulesSection').style.display = 'none';
      document.getElementById('resultsSection').style.display = 'none';
      document.getElementById('violationDetails').style.display = 'none';
      
      // 尝试隐藏其他可能的区域
      const keywordsInput = document.getElementById('keywordsInput');
      if (keywordsInput) keywordsInput.style.display = 'none';
      
      const compareFileSection = document.getElementById('commonCompareFileSection');
      if (compareFileSection) compareFileSection.style.display = 'none';
      
      const rehabFileUpload = document.getElementById('rehabFileUpload');
      if (rehabFileUpload) rehabFileUpload.style.display = 'none';
      
      // 取消所有规则的选中状态
      document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
      });
      
      // 重置康复评定选项
      const rehabNo = document.getElementById('rehabNo');
      if (rehabNo) rehabNo.checked = true;
      
      // 清空关键词输入
      const keywords = document.getElementById('keywords');
      if (keywords) keywords.value = '';
      
      // 重置年龄筛选
      const ageFilter = document.getElementById('ageFilter');
      if (ageFilter) ageFilter.checked = false;
      
      const ageInputArea = document.getElementById('ageInputArea');
      if (ageInputArea) ageInputArea.style.display = 'none';
      
      const filterMaxAge = document.getElementById('filterMaxAge');
      if (filterMaxAge) filterMaxAge.value = '';
      
      // 显示上传区域
      document.getElementById('dropArea').style.display = 'block';
    } catch (error) {
      console.error('重置页面时出错:', error);
    }
  }
  
  /**
   * 返回主页
   */
  function returnToHomepage() {
    try {
      // 隐藏检查记录相关页面
      document.getElementById('checkRecordsContainer').style.display = 'none';
      document.getElementById('recordDetailContainer').style.display = 'none';
      
      // 显示主页面
      document.getElementById('mainContent').style.display = 'block';
      
      // 重置页面状态
      resetPage();
    } catch (error) {
      console.error('返回主页时出错:', error);
    }
  }
  
  /**
   * 返回记录列表
   */
  function backToRecordsList() {
    try {
      document.getElementById('recordDetailContainer').style.display = 'none';
      document.getElementById('checkRecordsContainer').style.display = 'block';
    } catch (error) {
      console.error('返回记录列表时出错:', error);
    }
  }
  
  /**
   * 隐藏检查记录
   */
  function hideCheckRecords() {
    try {
      document.getElementById('checkRecordsContainer').style.display = 'none';
      document.getElementById('mainContent').style.display = 'block';
    } catch (error) {
      console.error('隐藏检查记录时出错:', error);
    }
  }
  
  // 确保所有函数在全局作用域中可用
  window.showViolationDetails = showViolationDetails;
  window.analyzeViolationResults = analyzeViolationResults;
  window.showViolationTable = showViolationTable;
  window.changeViolationView = changeViolationView;
  window.downloadResults = downloadResults;
  window.resetPage = resetPage;
  window.returnToHomepage = returnToHomepage;
  window.backToRecordsList = backToRecordsList;
  window.hideCheckRecords = hideCheckRecords;
  window.showCheckRecords = showCheckRecords;
  window.showRecordDetail = showRecordDetail;
  window.deleteSelectedRecords = deleteSelectedRecords;
  window.processData = processData;
  window.loadSelectedSheet = loadSelectedSheet;
  
  // 在页面加载后执行检查
  window.addEventListener('load', function() {
    console.log('页面加载完成，检查全局函数是否可用');
    
    // 检查关键函数是否可用
    const functions = [
      'showViolationDetails', 'analyzeViolationResults', 'showViolationTable',
      'changeViolationView', 'downloadResults', 'resetPage', 'returnToHomepage',
      'backToRecordsList', 'hideCheckRecords', 'showCheckRecords',
      'showRecordDetail', 'deleteSelectedRecords'
    ];
    
    functions.forEach(func => {
      console.log(`${func}: ${typeof window[func]}`);
    });
  });

  /**
   * 分析违规结果
   */
  function analyzeViolationResults() {
    if (!violationResults) return;
    
    const detailsDiv = document.getElementById('violationDetails');
    const contentDiv = document.getElementById('violationDetailsContent');
    const violations = violationResults.violations;
    const selectedRules = violationResults.selectedRules;
    
    let html = '<div id="violationAnalysisContainer">';
    
    // 添加年龄分析
    html += generateAgeAnalysis(violations);
    
    // 如果选择了规则2，添加诊断分析
    if (selectedRules.includes('2')) {
      html += generateDiagnosisAnalysis(violations, violationResults.diagnosisColumns);
    }
    
    html += '</div>';
    
    contentDiv.innerHTML = html;
    detailsDiv.style.display = 'block';
    
    // 显示所有操作按钮
    document.getElementById('downloadButton').style.display = 'inline-flex';
    document.getElementById('continueButton').style.display = 'inline-flex';
  };

  /**
   * 生成年龄分析
   * @param {Array} violations - 违规数据
   * @returns {string} - 年龄分析HTML
   */
  function generateAgeAnalysis(violations) {
    // 定义年龄组
    const ageGroups = [
      { name: '40岁以下', min: 0, max: 40, count: 0, amount: 0 },
      { name: '40-50岁', min: 40, max: 50, count: 0, amount: 0 },
      { name: '50-60岁', min: 50, max: 60, count: 0, amount: 0 },
      { name: '60岁及以上', min: 60, max: Infinity, count: 0, amount: 0 }
    ];
    
    // 统计各年龄组的违规数据
    violations.forEach(row => {
      if (!row) return;
      
      const age = row['患者年龄'];
      if (age === null || age === undefined) return;
      
      const violationCount = Math.min(row['违规次数'] || 0, row['次数'] || 0);
      const price = parseFloat(row['单价'] || 0);
      const amount = price * violationCount;
      
      // 找到对应的年龄组
      for (const group of ageGroups) {
        if (age >= group.min && age < group.max) {
          group.count++;
          group.amount += amount;
          break;
        }
      }
    });
    
    // 生成HTML
    let html = `
      <div class="analysis-section">
        <h3>年龄分析</h3>
        <table class="analysis-table">
          <thead>
            <tr>
              <th>年龄组</th>
              <th>违规记录数</th>
              <th>涉及金额(元)</th>
              <th>占比</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // 计算总金额
    const totalAmount = ageGroups.reduce((sum, group) => sum + group.amount, 0);
    
    // 添加各年龄组数据
    ageGroups.forEach(group => {
      const percentage = totalAmount > 0 ? ((group.amount / totalAmount) * 100).toFixed(2) : '0.00';
      html += `
        <tr>
          <td>${group.name}</td>
          <td>${group.count}</td>
          <td>${group.amount.toFixed(2)}</td>
          <td>${percentage}%</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    return html;
  };

  /**
   * 生成诊断分析
   * @param {Array} violations - 违规数据
   * @param {Array} diagnosisColumns - 诊断列
   * @returns {string} - 诊断分析HTML
   */
  function generateDiagnosisAnalysis(violations, diagnosisColumns) {
    // 提取所有诊断
    const diagnosisMap = new Map();
    
    violations.forEach(row => {
      if (!row) return;
      
      const violationCount = Math.min(row['违规次数'] || 0, row['次数'] || 0);
      const price = parseFloat(row['单价'] || 0);
      const amount = price * violationCount;
      
      // 遍历所有诊断列
      for (const col of diagnosisColumns) {
        if (row[col]) {
          const diagnosis = String(row[col]).trim();
          if (!diagnosis) continue;
          
          // 更新诊断统计
          if (!diagnosisMap.has(diagnosis)) {
            diagnosisMap.set(diagnosis, { count: 0, amount: 0 });
          }
          
          const stats = diagnosisMap.get(diagnosis);
          stats.count++;
          stats.amount += amount;
        }
      }
    });
    
    // 转换为数组并排序
    const diagnosisStats = Array.from(diagnosisMap.entries())
      .map(([diagnosis, stats]) => ({ diagnosis, ...stats }))
      .sort((a, b) => b.amount - a.amount);
    
    // 生成HTML
    let html = `
      <div class="analysis-section">
        <h3>诊断分析</h3>
        <table class="analysis-table">
          <thead>
            <tr>
              <th>诊断</th>
              <th>出现次数</th>
              <th>涉及金额(元)</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // 添加各诊断数据
    diagnosisStats.forEach(({ diagnosis, count, amount }) => {
      html += `
        <tr>
          <td>${diagnosis}</td>
          <td>${count}</td>
          <td>${amount.toFixed(2)}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    return html;
  };

  