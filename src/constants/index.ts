export const Roles = { Admin: 'admin', User: 'user' }

export const HttpStatus = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501
}

export const ResponseMessages = {
    UNAUTHORIZED: 'Unauthorized',
    FORBIDDEN: 'Forbidden',
    VALIDATION_ERROR: 'Validation Error',
    NOT_FOUND: 'Not Found',
    INTERNAL_ERROR: 'Internal Server Error',
    USER_BANNED: 'User is banned. Please contact admin for details.',
    MISSING_CODE: 'Missing code',
    OAUTH_ERROR: 'OAuth error',
    SUCCESS: 'Success',
    LOGOUT_SUCCESS: 'Logged out successfully',
    INSUFFICIENT_FUNDS: 'Insufficient funds',
    FAILED_UPLOAD: 'Failed to upload image',
    FAILED_JOIN: 'Failed to join group',
    GROUP_NOT_FOUND: 'Group not found',
    INVALID_CREDENTIALS: 'Invalid credentials',
    EMAIL_IN_USE: 'Email in use',
    INVALID_OTP: 'Invalid OTP',
    USER_NOT_FOUND: 'User not found',
    ALREADY_STARTED: 'Already started',
    CANNOT_CANCEL: 'Cannot cancel',
    EMAIL_NOT_VERIFIED: 'Email not verified',
    ALREADY_VERIFIED: 'User is already verified',
    ADMIN_LOGIN_ONLY: 'Admin login allowed only via admin portal',
    INVALID_TOKEN: 'Invalid token',
    FORBIDDEN_EDIT_GROUP: 'Forbidden: Only the owner can edit the group',
    BLOCKED_FROM_GROUP: 'You are blocked from joining this group',
    DUEL_NOT_FOUND: 'Duel not found',
    USERS_NOT_FOUND: 'Users not found',
    NO_PROBLEMS_AVAILABLE: 'No problems available to create a duel. Please seed the database.',
    CANNOT_JOIN_OWN_DUEL: 'Cannot join your own duel',
    CANNOT_CANCEL_NOT_WAITING: 'Cannot cancel a duel that is not waiting',
    ONLY_CREATOR_CAN_CANCEL: 'Only the creator can cancel the duel',
    COMPETITION_NOT_FOUND: 'Competition not found',
    PARTICIPANT_NOT_FOUND: 'Participant not found',
    NO_REFERENCE_SOLUTION: 'No reference solution found for this problem.',
    FAILED_SEND: 'Failed to send',
    INCORRECT_PASSWORD: 'Incorrect current password',
    AI_UNAVAILABLE: 'AI unavailable',
    GROUP_NAME_TAKEN: 'Group name is already taken'
}

export const ErrorCodes = { Validation: 'VALIDATION_ERROR', Unauthorized: 'UNAUTHORIZED', Forbidden: 'FORBIDDEN', NotFound: 'NOT_FOUND' }

