const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Cấu hình SQL Server
const dbConfig = {
    user: 'dashboard_user',
    password: '14092006',
    server: '10.20.30.204',
    database: 'energy_db',
    options: {
        encrypt: false,
        enableArithAbort: true
    }
};

// GET /api/data - Lấy dữ liệu thiết bị
app.get('/api/data', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .query('SELECT TOP 50 * FROM [dbo].[Data] ORDER BY [Timestamp] DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi lấy dữ liệu:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        await sql.close();
    }
});

// POST /api/update-label - Cập nhật nhãn thiết bị
app.post('/api/update-label', async (req, res) => {
    const { deviceId, label } = req.body;
    if (!deviceId || !label) {
        return res.status(400).json({ success: false, error: 'Thiếu deviceId hoặc label' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('deviceId', sql.VarChar, deviceId)
            .input('label', sql.VarChar, label)
            .query('UPDATE [dbo].[Data] SET [label] = @label WHERE [device_id] = @deviceId');

        res.json({ success: true, affectedRows: result.rowsAffected[0] });
    } catch (err) {
        console.error('Lỗi cập nhật nhãn:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        await sql.close();
    }
});

// POST /api/add-device - Thêm thiết bị mới
app.post('/api/add-device', async (req, res) => {
    const { deviceId, label, voltage, current, power } = req.body;
    if (!deviceId || !label || voltage == null || current == null || power == null) {
        return res.status(400).json({ success: false, error: 'Thiếu dữ liệu thiết bị' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        request.input('device_id', sql.VarChar, deviceId);
        request.input('label', sql.VarChar, label);
        request.input('voltage', sql.Float, voltage);
        request.input('current', sql.Float, current);
        request.input('power', sql.Float, power);

        const result = await request.query(`
            INSERT INTO [dbo].[Data] 
            ([device_id], [label], [Voltage], [CurrentValue], [Power], [Timestamp], [Status])
            VALUES (@device_id, @label, @voltage, @current, @power, GETDATE(), 'Active')
        `);

        res.json({
            success: true,
            message: 'Thêm thiết bị thành công',
            affectedRows: result.rowsAffected[0]
        });
    } catch (err) {
        console.error('Lỗi thêm thiết bị:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        await sql.close();
    }
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server backend đang chạy tại http://localhost:${port}`);
    console.log('API endpoints:');
    console.log('- GET /api/data - Lấy dữ liệu từ SQL Server');
    console.log('- POST /api/update-label - Cập nhật nhãn thiết bị');
    console.log('- POST /api/add-device - Thêm thiết bị mới');
});
