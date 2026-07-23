import mongoose from 'mongoose';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { Student } from './model.js';
import { Faculty } from '../faculty/model.js';
import { ApiError } from '../../utils/apiError.js';
import { logger } from '../../utils/logger.js';
import { createAuditLog } from '../../services/audit.service.js';

export const importStudentsService = async (fileBuffer, facultyId, fileType, actorId, actorRole, actorDepartment, actorDepartmentCode) => {
  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  if (actorRole === 'departmentAdmin') {
    if (actorDepartmentCode) {
      // Already resolved by auth middleware — good
    } else if (actorDepartment) {
      const Department = mongoose.model('Department');
      let dept = null;
      try {
        dept = await Department.findById(actorDepartment).select('name code');
      } catch {}
      if (!dept && typeof actorDepartment === 'string') {
        dept = await Department.findOne({ code: actorDepartment }).select('name code');
      }
      if (dept) {
        actorDepartmentCode = dept.code;
      } else {
        logger.error(`DepartmentAdmin ${actorId}: department "${actorDepartment}" not found in Department collection`);
      }
    } else {
      logger.error(`DepartmentAdmin ${actorId}: no department field set on account`);
    }
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
    note: null,
  };

  const isFacultyAdmin = actorRole === 'facultyAdmin';
  let departmentOverridden = false;

  for (const record of records) {
    try {
      const validationError = validateStudentRecord(record, isFacultyAdmin);
      if (validationError) {
        results.failed++;
        results.errors.push({
          row: record._row,
          error: validationError,
        });
        continue;
      }

      let department = record.department;

      if (!isFacultyAdmin) {
        if (!actorDepartmentCode) {
          results.failed++;
          let errorMsg = 'Your department could not be resolved. ';
          if (!actorDepartment) {
            errorMsg += 'Your account has no department assigned. Contact the administrator who created your account.';
          } else {
            errorMsg += `Your account references department "${actorDepartment}" which was not found. Contact the administrator to re-link your department.`;
          }
          results.errors.push({
            row: record._row,
            error: errorMsg,
          });
          continue;
        }
        if (record.department && record.department.toUpperCase() !== actorDepartmentCode.toUpperCase()) {
          departmentOverridden = true;
        }
        department = actorDepartmentCode;
      }

      if (isFacultyAdmin) {
        const Department = mongoose.model('Department');
        const deptExists = await Department.findOne({
          code: record.department.toUpperCase(),
          faculty: facultyId,
        }).lean();

        if (!deptExists) {
          const depts = await Department.find({ faculty: facultyId }).select('code').lean();
          const codes = depts.map(d => d.code).join(', ');
          results.failed++;
          results.errors.push({
            row: record._row,
            error: `Department "${record.department}" not found under ${faculty.code || faculty.name}. Available codes: ${codes}`,
          });
          continue;
        }
        department = deptExists.code;
      }

      const existing = await Student.findOne({
        registrationNumber: record.registrationNumber.toUpperCase(),
      });

      if (existing) {
        await Student.findByIdAndUpdate(existing._id, {
          fullName: record.fullName,
          email: record.email.toLowerCase(),
          department,
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
          department,
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

  createAuditLog({
    actor: actorId,
    action: 'import_students',
    entityType: 'Student',
    description: `Imported ${results.created} students (${results.updated} updated, ${results.failed} failed) for ${faculty.name}`,
    faculty: facultyId,
  });

  logger.info('Student import completed', {
    facultyId,
    total: results.total,
    created: results.created,
    updated: results.updated,
    failed: results.failed,
  });

  if (departmentOverridden) {
    results.note = `Department in your file was overridden to your department (${actorDepartmentCode}). Students are always assigned to your department.`;
  }

  return results;
};

export const batchCreateStudentsService = async (students, facultyId, actorId, actorRole, actorDepartment, actorDepartmentCode) => {
  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  if (actorRole === 'departmentAdmin') {
    if (actorDepartmentCode) {
      // Already resolved by auth middleware
    } else if (actorDepartment) {
      const Department = mongoose.model('Department');
      let dept = null;
      try {
        dept = await Department.findById(actorDepartment).select('name code');
      } catch {}
      if (!dept && typeof actorDepartment === 'string') {
        dept = await Department.findOne({ code: actorDepartment }).select('name code');
      }
      if (dept) {
        actorDepartmentCode = dept.code;
      } else {
        logger.error(`DepartmentAdmin ${actorId}: department "${actorDepartment}" not found in Department collection`);
      }
    } else {
      logger.error(`DepartmentAdmin ${actorId}: no department field set on account`);
    }
  }

  const isDepartmentAdmin = actorRole === 'departmentAdmin';
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

      let department = record.department;

      if (isDepartmentAdmin) {
        if (!actorDepartmentCode) {
          results.failed++;
          let errorMsg = 'Your department could not be resolved. ';
          if (!actorDepartment) {
            errorMsg += 'Your account has no department assigned. Contact the administrator who created your account.';
          } else {
            errorMsg += `Your account references department "${actorDepartment}" which was not found. Contact the administrator to re-link your department.`;
          }
          results.errors.push({
            row: i + 1,
            error: errorMsg,
          });
          continue;
        }
        department = actorDepartmentCode;
      }

      const existing = await Student.findOne({
        registrationNumber: record.registrationNumber.toUpperCase(),
      });

      if (existing) {
        await Student.findByIdAndUpdate(existing._id, {
          fullName: record.fullName,
          email: record.email.toLowerCase(),
          department,
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
          department,
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

  createAuditLog({
    actor: actorId,
    action: 'batch_create_students',
    entityType: 'Student',
    description: `Batch created ${results.created} students (${results.updated} updated, ${results.failed} failed) for ${faculty.name}`,
    faculty: facultyId,
  });

  logger.info('Batch student creation completed', {
    facultyId,
    total: results.total,
    created: results.created,
    updated: results.updated,
    failed: results.failed,
  });

  return results;
};

export const getAllStudentsService = async (query, facultyFilter = null, departmentCode = null) => {
  const { page, limit, skip } = getPagination(query);
  const filters = buildStudentFilters(query, facultyFilter);
  if (departmentCode) filters.department = departmentCode;

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

export const getStudentByIdService = async (studentId, facultyFilter = null, departmentCode = null) => {
  const filters = { _id: studentId };
  if (facultyFilter) filters.faculty = facultyFilter;
  if (departmentCode) filters.department = departmentCode;

  const student = await Student.findOne(filters).populate('faculty', 'name code');

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  return student;
};

export const updateStudentService = async (studentId, data, facultyFilter = null, departmentCode = null) => {
  const filters = { _id: studentId };
  if (facultyFilter) filters.faculty = facultyFilter;
  if (departmentCode) filters.department = departmentCode;

  const student = await Student.findOneAndUpdate(filters, data, {
    new: true,
    runValidators: true,
  }).populate('faculty', 'name code');

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  return student;
};

export const deleteStudentService = async (studentId, facultyFilter = null, actorId, departmentCode = null) => {
  const filters = { _id: studentId };
  if (facultyFilter) filters.faculty = facultyFilter;
  if (departmentCode) filters.department = departmentCode;

  const student = await Student.findOneAndDelete(filters);

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  createAuditLog({
    actor: actorId,
    action: 'delete_student',
    entityType: 'Student',
    entityId: student._id,
    description: `Deleted student: ${student.fullName} (${student.registrationNumber})`,
    faculty: student.faculty,
  });

  return { message: 'Student deleted successfully' };
};

export const searchStudentsService = async (searchTerm, facultyFilter = null, departmentCode = null) => {
  const filters = {
    $or: [
      { registrationNumber: { $regex: searchTerm, $options: 'i' } },
      { fullName: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { department: { $regex: searchTerm, $options: 'i' } },
    ],
  };

  if (facultyFilter) filters.faculty = facultyFilter;
  if (departmentCode) filters.department = departmentCode;

  const students = await Student.find(filters)
    .populate('faculty', 'name')
    .limit(50);

  return students;
};

export const getStudentStatsService = async (facultyFilter = null, departmentCode = null) => {
  const filters = {};
  if (facultyFilter) filters.faculty = facultyFilter;
  if (departmentCode) filters.department = departmentCode;

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

const validateStudentRecord = (record, requireDepartment = true) => {
  if (!record.registrationNumber) return 'Registration number is required';
  if (!record.fullName) return 'Full name is required';
  if (!record.email) return 'Email is required';
  if (requireDepartment && !record.department) return 'Department is required';
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
