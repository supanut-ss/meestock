import mssql from "mssql";

const config: mssql.config = {
  server: "94.237.76.153",
  database: "thaipes_meestock",
  user: "thaipes_dba",
  password: "Soulmate@2108",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise: Promise<mssql.ConnectionPool> | null = null;

export function getPool(): Promise<mssql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new mssql.ConnectionPool(config)
      .connect()
      .then(async (pool) => {
        console.log("⚡ SQL Server connected successfully");
        
        // Dynamic DB Migrations (Safely add tracking_no if missing)
        try {
          await pool.request().query(`
            IF COL_LENGTH('dbo.orders', 'tracking_no') IS NULL 
            BEGIN
              ALTER TABLE dbo.orders ADD tracking_no NVARCHAR(50) NULL;
              PRINT 'Added column tracking_no to dbo.orders';
            END
          `);
        } catch (err) {
          console.error("Migration warning (orders.tracking_no):", err);
        }
        
        return pool;
      })
      .catch((err) => {
        poolPromise = null;
        console.error("❌ SQL Server connection failed:", err);
        throw err;
      });
  }
  return poolPromise;
}

// Fetch the first merchant ID dynamically so we don't have hardcoded IDs
export async function getDemoMerchantId(): Promise<string> {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT TOP 1 id FROM dbo.merchants");
    if (result.recordset.length > 0) {
      return result.recordset[0].id.toString().toLowerCase();
    }
  } catch (err) {
    console.error("Error fetching merchant ID from DB:", err);
  }
  // Hardcoded seeded demo merchant ID fallback
  return "d6b5e022-ec98-4c4c-999a-c40ba247dd84"; 
}
