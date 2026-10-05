"use client";

import React from "react";
import {
  DataGrid,
  DataGridProps,
  GridToolbarContainer,
  GridToolbarQuickFilter,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
} from "@mui/x-data-grid";
import { Box, Typography, useMediaQuery } from "@mui/material";
import MobileCardList from "@/components/ui/MobileCardList";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { thaiDataGridLocale } from "@/lib/dataGridLocale";

interface CustomToolbarProps {
  quickFilterPlaceholder?: string;
  disableExport?: boolean;
  extraActions?: React.ReactNode;
}

export function MeeDataGridToolbar({
  quickFilterPlaceholder = "ค้นหาข้อมูลในตาราง...",
  disableExport = false,
  extraActions,
}: CustomToolbarProps) {
  return (
    <GridToolbarContainer
      sx={{
        p: 1.5,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 1.5,
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #f1f5f9",
        "& .MuiButton-root": {
          color: "#475569",
          fontWeight: 600,
          fontSize: "0.8125rem",
          borderRadius: "10px",
          px: 1.25,
          py: 0.6,
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.02)",
          transition: "all 0.15s ease",
          "&:hover": {
            backgroundColor: "#f1f5f9",
            borderColor: "#cbd5e1",
            color: "#1e293b",
          },
        },
        "& .MuiDataGrid-toolbarQuickFilter": {
          minWidth: { xs: "100%", sm: 260 },
          "& .MuiInputBase-root": {
            borderRadius: "10px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            px: 1.5,
            py: 0.35,
            fontSize: "0.8125rem",
            transition: "all 0.15s ease",
            "&:hover": {
              borderColor: "#cbd5e1",
              backgroundColor: "#ffffff",
            },
            "&.Mui-focused": {
              borderColor: "#6366f1",
              boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.12)",
              backgroundColor: "#ffffff",
            },
            "&::before, &::after": {
              display: "none",
            },
          },
        },
      }}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarDensitySelector />
        {!disableExport && <GridToolbarExport />}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: "auto" }}>
        {extraActions}
        <GridToolbarQuickFilter
          debounceMs={200}
          slotProps={{
            root: {
              placeholder: quickFilterPlaceholder,
              size: "small",
            },
          }}
        />
      </Box>
    </GridToolbarContainer>
  );
}

function CustomNoRowsOverlay() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        py: 6,
        color: "#94a3b8",
      }}
    >
      <InboxOutlinedIcon sx={{ fontSize: 48, mb: 1, color: "#cbd5e1" }} />
      <Typography variant="body2" sx={{ fontWeight: 600, color: "#64748b" }}>
        ไม่พบข้อมูลในตาราง
      </Typography>
      <Typography variant="caption" sx={{ color: "#94a3b8", mt: 0.5 }}>
        ไม่มีรายการที่ต้องแสดง หรือไม่มีข้อมูลตรงกับเงื่อนไขการค้นหา
      </Typography>
    </Box>
  );
}

export interface MeeDataGridProps extends Omit<DataGridProps, "localeText"> {
  quickFilterPlaceholder?: string;
  disableExport?: boolean;
  extraActions?: React.ReactNode;
  height?: number | string;
  pageSize?: number;
  autoHeight?: boolean;
  /** Render rows as cards below 1024px (default true) */
  mobileCards?: boolean;
}

export default function MeeDataGrid({
  quickFilterPlaceholder,
  disableExport,
  extraActions,
  height,
  pageSize = 25,
  autoHeight,
  mobileCards = true,
  sx,
  slots,
  slotProps,
  ...props
}: MeeDataGridProps) {
  const isCompact = useMediaQuery("(max-width:1023px)");
  const isAutoHeight = autoHeight ?? (!height || height === "auto");

  if (mobileCards && isCompact) {
    return (
      <MobileCardList
        rows={props.rows ?? []}
        columns={props.columns}
        getRowId={props.getRowId}
        loading={props.loading}
        searchPlaceholder={quickFilterPlaceholder}
        extraActions={extraActions}
        columnVisibilityModel={props.columnVisibilityModel}
        checkboxSelection={props.checkboxSelection}
        onSelectionChange={(ids) =>
          props.onRowSelectionModelChange?.({ type: "include", ids } as never, {} as never)
        }
      />
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: isAutoHeight ? "auto" : height,
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        overflow: "hidden",
      }}
    >
      <DataGrid
        localeText={thaiDataGridLocale}
        disableRowSelectionOnClick
        autoHeight={isAutoHeight}
        rowHeight={props.rowHeight || 64}
        columnHeaderHeight={46}
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{
          pagination: {
            paginationModel: { pageSize, page: 0 },
          },
          ...props.initialState,
        }}
        slots={{
          toolbar: () => (
            <MeeDataGridToolbar
              quickFilterPlaceholder={quickFilterPlaceholder}
              disableExport={disableExport}
              extraActions={extraActions}
            />
          ),
          noRowsOverlay: CustomNoRowsOverlay,
          noResultsOverlay: CustomNoRowsOverlay,
          ...slots,
        }}
        sx={{
          border: "none",
          fontFamily: "inherit",
          "& .MuiDataGrid-main": {
            backgroundColor: "#ffffff",
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "#f8fafc",
            color: "#475569",
            fontWeight: 700,
            fontSize: "0.75rem",
            letterSpacing: "0.025em",
            textTransform: "uppercase",
            borderBottom: "1px solid #e2e8f0",
          },
          "& .MuiDataGrid-columnHeader": {
            "&:focus, &:focus-within": {
              outline: "none",
            },
          },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontWeight: 700,
            color: "#475569",
          },
          "& .MuiDataGrid-row": {
            borderBottom: "1px solid #f1f5f9",
            transition: "background-color 0.15s ease",
            "&:hover": {
              backgroundColor: "#f8fafc",
            },
            "&.Mui-selected": {
              backgroundColor: "#eef2ff",
              "&:hover": {
                backgroundColor: "#e0e7ff",
              },
            },
          },
          "& .MuiDataGrid-cell": {
            display: "flex",
            alignItems: "center",
            fontSize: "0.8125rem",
            color: "#1e293b",
            borderColor: "#f1f5f9",
            px: 1.5,
            overflow: "hidden",
            "&:focus, &:focus-within": {
              outline: "none",
            },
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            minHeight: "52px",
          },
          "& .MuiTablePagination-root": {
            color: "#64748b",
            fontSize: "0.8125rem",
          },
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
            fontSize: "0.8125rem",
            fontWeight: 500,
          },
          "& .MuiCheckbox-root": {
            color: "#94a3b8",
            "&.Mui-checked": {
              color: "#4f46e5",
            },
          },
          ...sx,
        }}
        slotProps={slotProps}
        {...props}
      />
    </Box>
  );
}
