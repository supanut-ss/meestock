"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { useReactToPrint } from "react-to-print";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

type Product = {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  unitPrice: number;
  stockQty: number;
  lowStockThreshold: number;
};

const seedProducts: Product[] = [
  { id: "1", sku: "SKU-TS-001", barcode: "885000000001", name: "เสื้อยืดสีขาว", unitPrice: 199, stockQty: 22, lowStockThreshold: 5 },
  { id: "2", sku: "SKU-BG-002", barcode: "885000000002", name: "กระเป๋าผ้า", unitPrice: 149, stockQty: 8, lowStockThreshold: 4 },
  { id: "3", sku: "SKU-CP-003", barcode: "885000000003", name: "แก้วกาแฟ", unitPrice: 99, stockQty: 3, lowStockThreshold: 3 },
];

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [scannerValue, setScannerValue] = useState("");
  const [adjustQty, setAdjustQty] = useState(1);
  const [selected, setSelected] = useState<Product | null>(null);
  const [openBarcode, setOpenBarcode] = useState(false);

  const barcodeSvgRef = useRef<SVGSVGElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const printLabel = useReactToPrint({
    contentRef: printRef,
    documentTitle: selected?.sku ? `barcode-${selected.sku}` : "barcode-label",
  });

  useEffect(() => {
    if (!selected || !barcodeSvgRef.current) return;
    JsBarcode(barcodeSvgRef.current, selected.barcode || selected.sku, {
      format: "CODE128",
      displayValue: true,
      width: 2,
      height: 60,
      margin: 8,
      fontSize: 14,
    });
  }, [selected]);

  useEffect(() => {
    if (!scannerValue.trim()) return;
    const timer = setTimeout(() => {
      const code = scannerValue.trim();
      setProducts((prev) =>
        prev.map((p) => (p.barcode === code || p.sku === code ? { ...p, stockQty: p.stockQty + adjustQty } : p))
      );
      setScannerValue("");
    }, 220);

    return () => clearTimeout(timer);
  }, [scannerValue, adjustQty]);

  const lowStockCount = useMemo(() => products.filter((p) => p.stockQty <= p.lowStockThreshold).length, [products]);

  const columns: GridColDef<Product>[] = [
    { field: "sku", headerName: "SKU", flex: 1 },
    { field: "barcode", headerName: "Barcode", flex: 1.2 },
    { field: "name", headerName: "Product", flex: 1.4 },
    { field: "unitPrice", headerName: "Price", flex: 0.8 },
    { field: "stockQty", headerName: "Stock", flex: 0.7 },
    { field: "lowStockThreshold", headerName: "Low Alert", flex: 0.8 },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      flex: 1,
      renderCell: (params) => (
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            setSelected(params.row);
            setOpenBarcode(true);
          }}
        >
          Barcode
        </Button>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>Product Management</Typography>
      <Typography color="text.secondary">Low stock items: {lowStockCount}</Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          fullWidth
          label="Scanner / Barcode"
          placeholder="ยิงบาร์โค้ดเพื่อเพิ่ม/ลดสต็อกแบบ real-time"
          value={scannerValue}
          onChange={(e) => setScannerValue(e.target.value)}
          autoFocus
        />
        <TextField
          label="Adjust Qty"
          type="number"
          value={adjustQty}
          onChange={(e) => setAdjustQty(Number(e.target.value) || 1)}
          helperText="ใส่ + เพื่อรับเข้า, - เพื่อตัดออก"
          sx={{ minWidth: 180 }}
        />
      </Stack>

      <Box sx={{ height: 480, bgcolor: "background.paper", borderRadius: 2, overflow: "hidden" }}>
        <DataGrid
          rows={products}
          columns={columns}
          disableRowSelectionOnClick
          pageSizeOptions={[5, 10, 20]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
        />
      </Box>

      <Dialog open={openBarcode} onClose={() => setOpenBarcode(false)} fullWidth maxWidth="sm">
        <DialogTitle>Barcode Label</DialogTitle>
        <DialogContent>
          {selected && (
            <Stack spacing={2} alignItems="center" mt={1}>
              <Typography fontWeight={600}>{selected.name}</Typography>
              <svg ref={barcodeSvgRef} />
              <Typography variant="body2" color="text.secondary">{selected.sku}</Typography>
            </Stack>
          )}
          <div style={{ position: "absolute", left: -9999, top: -9999 }}>
            <div ref={printRef} style={{ width: "80mm", height: "30mm", padding: "4mm" }}>
              <p style={{ margin: 0, fontSize: "12px" }}>{selected?.name}</p>
              <svg ref={barcodeSvgRef} />
              <p style={{ margin: 0, fontSize: "10px" }}>{selected?.sku}</p>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBarcode(false)}>Close</Button>
          <Button variant="contained" onClick={printLabel}>Print Label</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
