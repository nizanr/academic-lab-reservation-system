import { v4 as uuid } from 'uuid';
import db from '../config/db.js';

/**
 * Check for time slot conflicts
 * Returns true if there's a conflict
 */
function hasConflict(academicId, date, startTime, endTime, excludeId = null) {
  let query = `
    SELECT COUNT(*) as count FROM consultation_appointments
    WHERE academic_id = ?
    AND scheduled_date = ?
    AND status IN ('APPROVED', 'PENDING')
    AND (
      (start_time < ? AND end_time > ?)
      OR (start_time < ? AND end_time > ?)
      OR (start_time >= ? AND end_time <= ?)
    )
  `;

  const params = [academicId, date, endTime, startTime, startTime, endTime, startTime, endTime];

  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }

  const result = db.prepare(query).get(...params);
  return result.count > 0;
}

/**
 * Check for device reservation conflicts
 */
function hasDeviceConflict(deviceId, date, startTime, endTime, excludeId = null) {
  let query = `
    SELECT COUNT(*) as count FROM device_reservations
    WHERE device_id = ?
    AND reserved_date = ?
    AND status IN ('APPROVED', 'PENDING', 'ACTIVE')
    AND (
      (start_time < ? AND end_time > ?)
      OR (start_time < ? AND end_time > ?)
      OR (start_time >= ? AND end_time <= ?)
    )
  `;

  const params = [deviceId, date, endTime, startTime, startTime, endTime, startTime, endTime];

  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }

  const result = db.prepare(query).get(...params);
  return result.count > 0;
}

/**
 * Request consultation appointment
 */
export function requestAppointment(req, res) {
  try {
    const { academic_id, scheduled_date, start_time, end_time, topic } = req.body;
    const studentId = req.user.userId;

    if (!academic_id || !scheduled_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Tüm alanlar gereklidir' });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date)) {
      return res.status(400).json({ error: 'Geçersiz tarih formatı' });
    }

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}$/.test(end_time)) {
      return res.status(400).json({ error: 'Geçersiz saat formatı' });
    }

    // Validate start_time < end_time
    if (start_time >= end_time) {
      return res.status(400).json({ error: 'Başlangıç saati bitiş saatinden önce olmalıdır' });
    }

    // Check if academic exists
    const academic = db.prepare('SELECT id FROM users WHERE id = ? AND role IN ("ACADEMIC", "SUPER_ADMIN")').get(academic_id);
    if (!academic) {
      return res.status(404).json({ error: 'Akademisyen bulunamadı' });
    }

    // Check for conflicts
    if (hasConflict(academic_id, scheduled_date, start_time, end_time)) {
      return res.status(409).json({
        error: 'Bu akademisyen seçilen saatte uygun değil',
        message: 'Lütfen farklı bir saat seçiniz',
      });
    }

    // Create appointment
    const appointmentId = uuid();
    const insert = db.prepare(`
      INSERT INTO consultation_appointments
      (id, student_id, academic_id, scheduled_date, start_time, end_time, topic, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `);

    insert.run(appointmentId, studentId, academic_id, scheduled_date, start_time, end_time, topic || null);

    // Log activity
    const logId = uuid();
    db.prepare(`
      INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(logId, studentId, 'REQUEST_APPOINTMENT', 'consultation_appointments', appointmentId, `Akademisyen: ${academic_id}, Tarih: ${scheduled_date}`);

    res.status(201).json({
      message: 'Randevu talebiniz alındı. Akademisyen onayını bekliyorsunuz.',
      appointment: {
        id: appointmentId,
        student_id: studentId,
        academic_id,
        scheduled_date,
        start_time,
        end_time,
        topic: topic || null,
        status: 'PENDING',
      },
    });
  } catch (error) {
    console.error('Request appointment error:', error);
    res.status(500).json({ error: 'Randevu talebinde hata' });
  }
}

/**
 * Get appointments for current user
 */
export function getMyAppointments(req, res) {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let appointments;

    if (role === 'STUDENT') {
      // Students see their own appointments
      appointments = db.prepare(`
        SELECT ca.*, u.name as academic_name, u.email as academic_email
        FROM consultation_appointments ca
        JOIN users u ON ca.academic_id = u.id
        WHERE ca.student_id = ?
        ORDER BY ca.scheduled_date DESC, ca.start_time DESC
      `).all(userId);
    } else if (role === 'ACADEMIC' || role === 'SUPER_ADMIN') {
      // Academics see appointments scheduled with them
      appointments = db.prepare(`
        SELECT ca.*, u.name as student_name, u.email as student_email
        FROM consultation_appointments ca
        JOIN users u ON ca.student_id = u.id
        WHERE ca.academic_id = ?
        ORDER BY ca.scheduled_date DESC, ca.start_time DESC
      `).all(userId);
    }

    res.json({ appointments });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Randevuları alma hatası' });
  }
}

/**
 * Approve appointment (Academic/Admin only)
 */
export function approveAppointment(req, res) {
  try {
    const { appointmentId } = req.params;
    const academicId = req.user.userId;

    const appointment = db.prepare('SELECT * FROM consultation_appointments WHERE id = ?').get(appointmentId);

    if (!appointment) {
      return res.status(404).json({ error: 'Randevu bulunamadı' });
    }

    if (appointment.academic_id !== academicId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Bu randevuyu onaylama yetkiniz yok' });
    }

    const update = db.prepare(`
      UPDATE consultation_appointments
      SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(appointmentId);

    // Log activity
    const logId = uuid();
    db.prepare(`
      INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(logId, academicId, 'APPROVE_APPOINTMENT', 'consultation_appointments', appointmentId, 'Onay');

    res.json({
      message: 'Randevu onaylandı',
      appointment: db.prepare('SELECT * FROM consultation_appointments WHERE id = ?').get(appointmentId),
    });
  } catch (error) {
    console.error('Approve appointment error:', error);
    res.status(500).json({ error: 'Onay hatası' });
  }
}

/**
 * Reject appointment (Academic/Admin only)
 */
export function rejectAppointment(req, res) {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const academicId = req.user.userId;

    const appointment = db.prepare('SELECT * FROM consultation_appointments WHERE id = ?').get(appointmentId);

    if (!appointment) {
      return res.status(404).json({ error: 'Randevu bulunamadı' });
    }

    if (appointment.academic_id !== academicId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Bu randevuyu reddetme yetkiniz yok' });
    }

    const update = db.prepare(`
      UPDATE consultation_appointments
      SET status = 'REJECTED', notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(reason || null, appointmentId);

    // Log activity
    const logId = uuid();
    db.prepare(`
      INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(logId, academicId, 'REJECT_APPOINTMENT', 'consultation_appointments', appointmentId, `Red: ${reason || 'Gerekçe yok'}`);

    res.json({
      message: 'Randevu reddedildi',
      appointment: db.prepare('SELECT * FROM consultation_appointments WHERE id = ?').get(appointmentId),
    });
  } catch (error) {
    console.error('Reject appointment error:', error);
    res.status(500).json({ error: 'Red hatası' });
  }
}

/**
 * Request device reservation
 */
export function requestDeviceReservation(req, res) {
  try {
    const { device_id, reserved_date, start_time, end_time, purpose } = req.body;
    const studentId = req.user.userId;

    if (!device_id || !reserved_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Tüm alanlar gereklidir' });
    }

    // Validate date and time format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reserved_date)) {
      return res.status(400).json({ error: 'Geçersiz tarih formatı' });
    }

    if (!/^\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}$/.test(end_time)) {
      return res.status(400).json({ error: 'Geçersiz saat formatı' });
    }

    if (start_time >= end_time) {
      return res.status(400).json({ error: 'Başlangıç saati bitiş saatinden önce olmalıdır' });
    }

    // Check if device exists and is available
    const device = db.prepare('SELECT * FROM lab_devices WHERE id = ? AND status = "AVAILABLE"').get(device_id);
    if (!device) {
      return res.status(404).json({ error: 'Cihaz bulunamadı veya uygun değil' });
    }

    // Calculate duration
    const [startHour, startMin] = start_time.split(':').map(Number);
    const [endHour, endMin] = end_time.split(':').map(Number);
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    if (durationMinutes <= 0 || durationMinutes > device.max_reservation_minutes) {
      return res.status(400).json({
        error: `Rezervasyon süresi 1 ile ${device.max_reservation_minutes} dakika arasında olmalıdır`,
      });
    }

    // Check for conflicts
    if (hasDeviceConflict(device_id, reserved_date, start_time, end_time)) {
      return res.status(409).json({
        error: 'Bu cihaz seçilen saatte uygun değil',
        message: 'Lütfen farklı bir saat seçiniz',
      });
    }

    // Create reservation
    const reservationId = uuid();
    const insert = db.prepare(`
      INSERT INTO device_reservations
      (id, student_id, device_id, reserved_date, start_time, end_time, duration_minutes, purpose, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `);

    insert.run(reservationId, studentId, device_id, reserved_date, start_time, end_time, durationMinutes, purpose || null);

    // Log activity
    const logId = uuid();
    db.prepare(`
      INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(logId, studentId, 'REQUEST_RESERVATION', 'device_reservations', reservationId, `Cihaz: ${device.name}, Tarih: ${reserved_date}, Süre: ${durationMinutes} dakika`);

    res.status(201).json({
      message: 'Cihaz rezervasyon talebiniz alındı',
      reservation: {
        id: reservationId,
        student_id: studentId,
        device_id,
        device_name: device.name,
        reserved_date,
        start_time,
        end_time,
        duration_minutes: durationMinutes,
        purpose: purpose || null,
        status: 'PENDING',
      },
    });
  } catch (error) {
    console.error('Request reservation error:', error);
    res.status(500).json({ error: 'Rezervasyon talebinde hata' });
  }
}

/**
 * Get device reservations for current user
 */
export function getMyReservations(req, res) {
  try {
    const userId = req.user.userId;

    const reservations = db.prepare(`
      SELECT dr.*, ld.name as device_name, ld.category
      FROM device_reservations dr
      JOIN lab_devices ld ON dr.device_id = ld.id
      WHERE dr.student_id = ?
      ORDER BY dr.reserved_date DESC, dr.start_time DESC
    `).all(userId);

    res.json({ reservations });
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({ error: 'Rezervasyonları alma hatası' });
  }
}

/**
 * Get all pending reservations (Admin/Academic)
 */
export function getPendingReservations(req, res) {
  try {
    const reservations = db.prepare(`
      SELECT dr.*, ld.name as device_name, ld.category, u.name as student_name, u.email as student_email
      FROM device_reservations dr
      JOIN lab_devices ld ON dr.device_id = ld.id
      JOIN users u ON dr.student_id = u.id
      WHERE dr.status = 'PENDING'
      ORDER BY dr.created_at DESC
    `).all();

    res.json({ reservations });
  } catch (error) {
    console.error('Get pending reservations error:', error);
    res.status(500).json({ error: 'Beklemede olan rezervasyonları alma hatası' });
  }
}

/**
 * Approve device reservation (Admin only)
 */
export function approveReservation(req, res) {
  try {
    const { reservationId } = req.params;

    const reservation = db.prepare('SELECT * FROM device_reservations WHERE id = ?').get(reservationId);

    if (!reservation) {
      return res.status(404).json({ error: 'Rezervasyon bulunamadı' });
    }

    const update = db.prepare(`
      UPDATE device_reservations
      SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(reservationId);

    // Log activity
    const logId = uuid();
    db.prepare(`
      INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(logId, req.user.userId, 'APPROVE_RESERVATION', 'device_reservations', reservationId, 'Onay');

    res.json({
      message: 'Rezervasyon onaylandı',
      reservation: db.prepare('SELECT * FROM device_reservations WHERE id = ?').get(reservationId),
    });
  } catch (error) {
    console.error('Approve reservation error:', error);
    res.status(500).json({ error: 'Onay hatası' });
  }
}

/**
 * Reject device reservation (Admin only)
 */
export function rejectReservation(req, res) {
  try {
    const { reservationId } = req.params;
    const { reason } = req.body;

    const reservation = db.prepare('SELECT * FROM device_reservations WHERE id = ?').get(reservationId);

    if (!reservation) {
      return res.status(404).json({ error: 'Rezervasyon bulunamadı' });
    }

    const update = db.prepare(`
      UPDATE device_reservations
      SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(reservationId);

    // Log activity
    const logId = uuid();
    db.prepare(`
      INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(logId, req.user.userId, 'REJECT_RESERVATION', 'device_reservations', reservationId, `Red: ${reason || 'Gerekçe yok'}`);

    res.json({
      message: 'Rezervasyon reddedildi',
      reservation: db.prepare('SELECT * FROM device_reservations WHERE id = ?').get(reservationId),
    });
  } catch (error) {
    console.error('Reject reservation error:', error);
    res.status(500).json({ error: 'Red hatası' });
  }
}

/**
 * Get statistics and analytics
 */
export function getStatistics(req, res) {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let stats = {};

    if (role === 'ACADEMIC') {
      // Academic statistics
      const appointmentStats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected
        FROM consultation_appointments
        WHERE academic_id = ?
      `).get(userId);

      stats = {
        appointments: appointmentStats,
        approvalRate: appointmentStats.total > 0 ? ((appointmentStats.approved / appointmentStats.total) * 100).toFixed(2) : 0,
      };
    } else if (role === 'STUDENT') {
      // Student statistics
      const appointmentStats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected
        FROM consultation_appointments
        WHERE student_id = ?
      `).get(userId);

      const reservationStats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected
        FROM device_reservations
        WHERE student_id = ?
      `).get(userId);

      stats = {
        appointments: appointmentStats,
        reservations: reservationStats,
      };
    } else if (role === 'SUPER_ADMIN') {
      // Admin statistics
      const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      const studentCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "STUDENT"').get().count;
      const academicCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "ACADEMIC"').get().count;

      const deviceCount = db.prepare('SELECT COUNT(*) as count FROM lab_devices WHERE status = "AVAILABLE"').get().count;

      const appointmentStats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
        FROM consultation_appointments
      `).get();

      const reservationStats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
        FROM device_reservations
      `).get();

      stats = {
        users: {
          total: totalUsers,
          students: studentCount,
          academics: academicCount,
        },
        devices: deviceCount,
        appointments: appointmentStats,
        reservations: reservationStats,
      };
    }

    res.json({ statistics: stats });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'İstatistikleri alma hatası' });
  }
}

/**
 * Get available academics and their slots
 */
export function getAvailableAcademics(req, res) {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Geçerli bir tarih sağlayınız (YYYY-MM-DD)' });
    }

    const dayOfWeek = new Date(date).getDay();

    const academics = db.prepare(`
      SELECT DISTINCT u.id, u.name, u.email, u.department
      FROM users u
      WHERE u.role = 'ACADEMIC'
      ORDER BY u.name
    `).all();

    const availableAcademics = academics.map((academic) => {
      const slots = db.prepare(`
        SELECT * FROM academic_availability
        WHERE academic_id = ? AND day_of_week = ?
      `).all(academic.id, dayOfWeek);

      return {
        ...academic,
        slots: slots,
      };
    });

    res.json({ academics: availableAcademics });
  } catch (error) {
    console.error('Get available academics error:', error);
    res.status(500).json({ error: 'Akademisyenları alma hatası' });
  }
}

/**
 * Get available devices
 */
export function getAvailableDevices(req, res) {
  try {
    const devices = db.prepare(`
      SELECT * FROM lab_devices
      WHERE status = 'AVAILABLE'
      ORDER BY category, name
    `).all();

    res.json({ devices });
  } catch (error) {
    console.error('Get available devices error:', error);
    res.status(500).json({ error: 'Cihazları alma hatası' });
  }
}

/**
 * Get device usage statistics
 */
export function getDeviceUsageStats(req, res) {
  try {
    const deviceStats = db.prepare(`
      SELECT
        ld.id,
        ld.name,
        ld.category,
        COUNT(dr.id) as total_reservations,
        SUM(CASE WHEN dr.status = 'APPROVED' THEN 1 ELSE 0 END) as approved_reservations,
        SUM(CASE WHEN dr.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_reservations,
        SUM(dr.duration_minutes) as total_minutes_reserved
      FROM lab_devices ld
      LEFT JOIN device_reservations dr ON ld.id = dr.device_id
      WHERE ld.status = 'AVAILABLE'
      GROUP BY ld.id, ld.name, ld.category
      ORDER BY total_reservations DESC
    `).all();

    res.json({ devices: deviceStats });
  } catch (error) {
    console.error('Get device usage stats error:', error);
    res.status(500).json({ error: 'Cihaz istatistiklerini alma hatası' });
  }
}
