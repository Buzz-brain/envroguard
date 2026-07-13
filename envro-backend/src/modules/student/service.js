import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { Student } from './model.js';
import { Faculty } from '../faculty/model.js';
import { ApiError } from '../../utils/apiError.js';
import { logger } from '../../utils/logger.js';

export const importStudentsService = async (fileBuffer, facultyId, fileType) => {
  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  let records;

  if (fileType === 'csv') {
    records = await parseCSV(fileBuffer);
  } else {
    records = await parseExcel(fileBuffer);
  }

  if (records.length === 0) {
    throw new ApiError(400, 'No student records found in file');
  }

  const results = {
    total: records.length,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  for (const record of records) {
    try {
      const validationError = validateStudentRecord(record);
      if (validationError) {
        results.failed++;
        results.errors.push({
          row: record._row,
          error: validationError,
        });
        continue;
      }

      const existing = await Student.findOne({
        registrationNumber: record.registrationNumber.toUpperCase(),
      });

      if (existing) {
        await Student.findByIdAndUpdate(existing._id, {
          fullName: record.fullName,
          email: record.email.toLowerCase(),
          department: record.department,
          faculty: facultyId,
          level: record.level,
          isEligible: true,
        });
        results.updated++;
      } else {
        await Student.create({
          registrationNumber: record.registrationNumber.toUpperCase(),
          fullName: record.fullName,
          email: record.email.toLowerCase(),
          department: record.department,
          faculty: facultyId,
          level: record.level,
          isEligible: true,
        });
        results.created++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        row: record._row,
        error: error.message || 'Unknown error',
      });
    }
  }

  logger.info('Student import completed', {
    facultyId,
    total: results.total,
    created: results.created,
    updated: results.updated,
    failed: results.failed,
  });

  return results;
};

export const batchCreateStudentsService = async (students, facultyId) => {
  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  const results = {
    total: students.length,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < students.length; i++) {
    const record = students[i];
    try {
      const validationError = validateStudentRecord(record);
      if (validationError) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: validationError,
        });
        continue;
      }

      const existing = await Student.findOne({
        registrationNumber: record.registrationNumber.toUpperCase(),
      });

      if (existing) {
        await Student.findByIdAndUpdate(existing._id, {
          fullName: record.fullName,
          email: record.email.toLowerCase(),
          department: record.department,
          faculty: facultyId,
          level: record.level,
          isEligible: true,
        });
        results.updated++;
      } else {
        await Student.create({
          registrationNumber: record.registrationNumber.toUpperCase(),
          fullName: record.fullName,
          email: record.email.toLowerCase(),
          department: record.department,
          faculty: facultyId,
          level: record.level,
          isEligible: true,
        });
        results.created++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        row: i + 1,
        error: error.message || 'Unknown error',
      });
    }
  }

  logger.info('Batch student creation completed', {
    facultyId,
    total: results.total,
    created: results.created,
    updated: results.updated,
    failed: results.failed,
  });

  return results;
};

export const getAllStudentsService = async (query, facultyFilter = null) => {
  const { page, limit, skip } = getPagination(query);
  const filters = buildStudentFilters(query, facultyFilter);

  const [students, total] = await Promise.all([
    Student.find(filters)
      .populate('faculty', 'name code')
      .sort(buildSort(query))
      .skip(skip)
      .limit(limit),
    Student.countDocuments(filters),
  ]);

  return {
    students,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

export const getStudentByIdService = async (studentId, facultyFilter = null) => {
  const filters = { _id: studentId };
  if (facultyFilter) filters.faculty = facultyFilter;

  const student = await Student.findOne(filters).populate('faculty', 'name code');

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  return student;
};

export const updateStudentService = async (studentId, data, facultyFilter = null) => {
  const filters = { _id: studentId };
  if (facultyFilter) filters.faculty = facultyFilter;

  const student = await Student.findOneAndUpdate(filters, data, {
    new: true,
    runValidators: true,
  }).populate('faculty', 'name code');

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  return student;
};

export const deleteStudentService = async (studentId, facultyFilter = null) => {
  const filters = { _id: studentId };
  if (facultyFilter) filters.faculty = facultyFilter;

  const student = await Student.findOneAndDelete(filters);

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  return { message: 'Student deleted successfully' };
};

export const searchStudentsService = async (searchTerm, facultyFilter = null) => {
  const filters = {
    $or: [
      { registrationNumber: { $regex: searchTerm, $options: 'i' } },
      { fullName: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { department: { $regex: searchTerm, $options: 'i' } },
    ],
  };

  if (facultyFilter) filters.faculty = facultyFilter;

  const students = await Student.find(filters)
    .populate('faculty', 'name')
    .limit(50);

  return students;
};

export const getStudentStatsService = async (facultyFilter = null) => {
  const filters = {};
  if (facultyFilter) filters.faculty = facultyFilter;

  const [total, eligible, ineligible] = await Promise.all([
    Student.countDocuments(filters),
    Student.countDocuments({ ...filters, isEligible: true }),
    Student.countDocuments({ ...filters, isEligible: false }),
  ]);

  const byDepartment = await Student.aggregate([
    { $match: filters },
    { $group: { _id: '$department', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const byLevel = await Student.aggregate([
    { $match: filters },
    { $group: { _id: '$level', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  return { total, eligible, ineligible, byDepartment, byLevel };
};

// ─── Private Helpers ─────────────────────────────────────────────────────

const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const records = [];
    let rowIndex = 0;

    Readable.from(buffer)
      .pipe(csv())
      .on('data', (row) => {
        rowIndex++;
        records.push({ ...normalizeRecord(row), _row: rowIndex });
      })
      .on('end', () => resolve(records))
      .on('error', reject);
  });
};

const parseExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  return rows.map((row, index) => ({
    ...normalizeRecord(row),
    _row: index + 1,
  }));
};

const normalizeRecord = (row) => {
  const keys = Object.keys(row);

  const findKey = (possible) => {
    return keys.find(
      (k) => k.toLowerCase().trim() === possible.toLowerCase()
    );
  };

  return {
    registrationNumber: row[findKey('registrationNumber') || findKey('reg_number') || findKey('reg_no') || findKey('id')] || '',
    fullName: row[findKey('fullName') || findKey('full_name') || findKey('name')] || '',
    email: row[findKey('email') || findKey('school_email') || findKey('school_email_address')] || '',
    department: row[findKey('department') || findKey('dept')] || '',
    level: row[findKey('level') || findKey('year') || findKey('class')] || '',
  };
};

const validateStudentRecord = (record) => {
  if (!record.registrationNumber) return 'Registration number is required';
  if (!record.fullName) return 'Full name is required';
  if (!record.email) return 'Email is required';
  if (!record.department) return 'Department is required';
  if (!record.level) return 'Level is required';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(record.email)) return 'Invalid email format';

  return null;
};

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  return { page, limit, skip: (page - 1) * limit };
};

const buildStudentFilters = (query, facultyFilter) => {
  const filters = {};
  if (facultyFilter) filters.faculty = facultyFilter;
  if (query.isEligible !== undefined) filters.isEligible = query.isEligible === 'true';
  if (query.department) filters.department = { $regex: query.department, $options: 'i' };
  if (query.level) filters.level = query.level;

  if (query.search) {
    filters.$or = [
      { registrationNumber: { $regex: query.search, $options: 'i' } },
      { fullName: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
    ];
  }

  return filters;
};

const buildSort = (query) => {
  if (query.sort) {
    const field = query.sort.startsWith('-') ? query.sort.slice(1) : query.sort;
    const order = query.sort.startsWith('-') ? -1 : 1;
    return { [field]: order };
  }
  return { createdAt: -1 };
};

const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page < Math.ceil(total / limit),
  hasPrevPage: page > 1,
});
