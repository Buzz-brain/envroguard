import { asyncHandler, apiResponse } from '../../utils/index.js';
import * as deviceTokenService from './service.js';

export const registerToken = asyncHandler(async (req, res) => {
  const { token, platform } = req.body;
  const roleModelMap = {
    student: 'StudentAccount',
    departmentAdmin: 'DepartmentAdmin',
    facultyAdmin: 'FacultyAdmin',
    environmentalAdmin: 'EnvironmentalAdmin',
  };

  const userModel = roleModelMap[req.user.role] || 'StudentAccount';

  const deviceToken = await deviceTokenService.registerTokenService(
    req.user.id,
    userModel,
    token,
    platform
  );

  return apiResponse(res, 201, 'Device token registered', deviceToken);
});

export const unregisterToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  await deviceTokenService.unregisterTokenService(token);
  return apiResponse(res, 200, 'Device token unregistered');
});
