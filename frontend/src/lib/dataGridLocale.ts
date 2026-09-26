import { GridLocaleText } from "@mui/x-data-grid";

export const thaiDataGridLocale: Partial<GridLocaleText> = {
  // Root
  noRowsLabel: "ไม่พบข้อมูล",
  noResultsOverlayLabel: "ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา",

  // Density selector toolbar button text
  toolbarDensity: "ความหนาแน่น",
  toolbarDensityLabel: "ความหนาแน่น",
  toolbarDensityCompact: "กะทัดรัด",
  toolbarDensityStandard: "มาตรฐาน",
  toolbarDensityComfortable: "โปร่งสบาย",

  // Columns selector toolbar button text
  toolbarColumns: "เลือกคอลัมน์",
  toolbarColumnsLabel: "เลือกคอลัมน์ที่ต้องการแสดง",

  // Filters toolbar button text
  toolbarFilters: "ตัวกรอง",
  toolbarFiltersLabel: "แสดงตัวกรอง",
  toolbarFiltersTooltipHide: "ซ่อนตัวกรอง",
  toolbarFiltersTooltipShow: "แสดงตัวกรอง",

  // Quick filter toolbar field
  toolbarQuickFilterPlaceholder: "ค้นหาข้อมูลในตาราง...",
  toolbarQuickFilterLabel: "ค้นหา",
  toolbarQuickFilterDeleteIconLabel: "ล้างการค้นหา",

  // Export selector toolbar button text
  toolbarExport: "ส่งออกข้อมูล",
  toolbarExportLabel: "ส่งออกข้อมูล",
  toolbarExportCSV: "ดาวน์โหลด CSV",
  toolbarExportPrint: "พิมพ์ตาราง",

  // Columns management text
  columnsManagementSearchTitle: "ค้นหาคอลัมน์",
  columnsManagementNoColumns: "ไม่มีคอลัมน์",
  columnsManagementShowHideAllText: "แสดง/ซ่อน ทั้งหมด",
  columnsManagementReset: "รีเซ็ต",

  // Filter panel text
  filterPanelAddFilter: "เพิ่มเงื่อนไข",
  filterPanelRemoveAll: "ลบเงื่อนไขทั้งหมด",
  filterPanelDeleteIconLabel: "ลบ",
  filterPanelOperator: "ตัวดำเนินการ",
  filterPanelOperatorAnd: "และ",
  filterPanelOperatorOr: "หรือ",
  filterPanelColumn: "คอลัมน์",
  filterPanelInputLabel: "ค่าที่ต้องการค้นหา",
  filterPanelInputPlaceholder: "ระบุข้อความ...",

  // Filter operators text
  filterOperatorContains: "มีคำว่า",
  filterOperatorDoesNotContain: "ไม่มีคำว่า",
  filterOperatorEquals: "เท่ากับ",
  filterOperatorDoesNotEqual: "ไม่เท่ากับ",
  filterOperatorStartsWith: "ขึ้นต้นด้วย",
  filterOperatorEndsWith: "ลงท้ายด้วย",
  filterOperatorIs: "เป็น",
  filterOperatorNot: "ไม่เป็น",
  filterOperatorAfter: "หลังวันที่",
  filterOperatorOnOrAfter: "ตั้งแต่วันที่",
  filterOperatorBefore: "ก่อนวันที่",
  filterOperatorOnOrBefore: "จนถึงวันที่",
  filterOperatorIsEmpty: "ว่างเปล่า",
  filterOperatorIsNotEmpty: "ไม่ว่างเปล่า",
  filterOperatorIsAnyOf: "เป็นค่าใดค่าหนึ่งใน",

  // Column menu text
  columnMenuLabel: "เมนูคอลัมน์",
  columnMenuShowColumns: "แสดง/ซ่อน คอลัมน์",
  columnMenuManageColumns: "จัดการคอลัมน์",
  columnMenuFilter: "ตัวกรอง",
  columnMenuHideColumn: "ซ่อนคอลัมน์นี้",
  columnMenuUnsort: "ยกเลิกการเรียงลำดับ",
  columnMenuSortAsc: "เรียงจากน้อยไปมาก / ก-ฮ",
  columnMenuSortDesc: "เรียงจากมากไปน้อย / ฮ-ก",

  // Column header text
  columnHeaderFiltersTooltipActive: (count) =>
    count !== 1 ? `ใช้งาน ${count} ตัวกรอง` : `ใช้งาน 1 ตัวกรอง`,
  columnHeaderFiltersLabel: "แสดงตัวกรอง",
  columnHeaderSortIconLabel: "เรียงลำดับ",

  // Rows selected footer text
  footerRowSelected: (count) =>
    count !== 1
      ? `เลือกแล้ว ${count.toLocaleString()} แถว`
      : `เลือกแล้ว 1 แถว`,

  // Total row amount footer text
  footerTotalRows: "จำนวนทั้งหมด:",
  footerTotalVisibleRows: (visibleCount, totalCount) =>
    `${visibleCount.toLocaleString()} จาก ${totalCount.toLocaleString()}`,

  // Pagination
  paginationRowsPerPage: "รายการต่อหน้า:",
  paginationDisplayedRows: ({ from, to, count }) =>
    `${from}-${to} จาก ${count !== -1 ? count.toLocaleString() : `มากกว่า ${to}`}`,

  // Checkbox selection text
  checkboxSelectionHeaderName: "เลือก",
  checkboxSelectionSelectAllRows: "เลือกแถวทั้งหมด",
  checkboxSelectionUnselectAllRows: "ยกเลิกการเลือกแถวทั้งหมด",
  checkboxSelectionSelectRow: "เลือกแถว",
  checkboxSelectionUnselectRow: "ยกเลิกการเลือกแถว",

  // Boolean cell text
  booleanCellTrueLabel: "ใช่",
  booleanCellFalseLabel: "ไม่ใช่",
};
