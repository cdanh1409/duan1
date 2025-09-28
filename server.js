// Import thư viện
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

// Tạo app Express
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Cho phép truy cập file html tại cùng folder

// Cấu hình SQL Server
const dbConfig = {
    user: 'dashboard_user',
    password: '14092006',
    server: '127.0.0.1',        // Nếu SQL chạy cùng máy
    database: 'ESP32Data',       // Database thực tế
    options: {
        encrypt: false,
        enableArithAbort: true
    }
};

// === GET /api/data ===
app.get('/api/data', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .query('SELECT TOP 1000 * FROM [dbo].[Data] ORDER BY [Timestamp] DESC');

        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi khi fetch data:', err);
        res.status(500).json({ error: err.message });
    } finally {
        await sql.close();
    }
});

// === POST /api/add-device ===
app.post('/api/add-device', async (req, res) => {
    const { device_id, label, Voltage, CurrentValue, Power, Status } = req.body;

    if (!device_id || !label || Voltage == null || CurrentValue == null || Power == null || !Status) {
        return res.status(400).json({ success: false, error: 'Thiếu dữ liệu thiết bị' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        request.input('device_id', sql.VarChar, device_id);
        request.input('label', sql.VarChar, label);
        request.input('Voltage', sql.Float, Voltage);
        request.input('CurrentValue', sql.Float, CurrentValue);
        request.input('Power', sql.Float, Power);
        request.input('Status', sql.VarChar, Status);

        const result = await request.query(`
            INSERT INTO [dbo].[Data]
            ([device_id], [label], [Voltage], [CurrentValue], [Power], [Timestamp], [Status])
            VALUES (@device_id, @label, @Voltage, @CurrentValue, @Power, GETDATE(), @Status)
        `);

        res.json({ success: true, affectedRows: result.rowsAffected[0] });

    } catch (err) {
        console.error('Lỗi khi thêm thiết bị:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        await sql.close();
    }
});

// === PUT /api/update-device/:id ===
app.put('/api/update-device/:id', async (req, res) => {
    const id = req.params.id;
    const { label, Status } = req.body;

    if (!label && !Status) return res.status(400).json({ error: 'Không có dữ liệu cập nhật' });

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        if (label) request.input('label', sql.VarChar, label);
        if (Status) request.input('Status', sql.VarChar, Status);

        const query = `
            UPDATE [dbo].[Data]
            SET ${label ? '[label] = @label' : ''}${label && Status ? ',' : ''}${Status ? '[Status] = @Status' : ''}
            WHERE Id = @id
        `;
        request.input('id', sql.Int, id);
        const result = await request.query(query);

        res.json({ success: true, affectedRows: result.rowsAffected[0] });

    } catch (err) {
        console.error('Lỗi khi update thiết bị:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        await sql.close();
    }
});

// === DELETE /api/delete/:id ===
app.delete('/api/delete/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        request.input('id', sql.Int, id);
        const result = await request.query('DELETE FROM [dbo].[Data] WHERE Id = @id');

        res.json({ success: true, affectedRows: result.rowsAffected[0] });
    } catch (err) {
        console.error('Lỗi khi xóa thiết bị:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        await sql.close();
    }
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server backend đang chạy tại http://localhost:${port}`);
});
