import { MMKV } from 'react-native-mmkv';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create MMKV instance with error handling
let storage;
try {
  storage = new MMKV();
} catch (error) {
  console.warn('MMKV not available, falling back to AsyncStorage:', error.message);
  storage = null;
}

// Fallback storage functions
const fallbackStorage = {
  set: (key, value) => AsyncStorage.setItem(key, value),
  getString: (key) => AsyncStorage.getItem(key),
  delete: (key) => AsyncStorage.removeItem(key)
};

const getStorage = () => storage || fallbackStorage;

const ACCESS_KEY = 'ACCESS_TOKEN';
const REFRESH_KEY = 'REFRESH_TOKEN';
const UUID_KEY = 'USER_UUID';
const CMP_UUID_KEY = 'USER_CMP_UUID';
const ENV_UUID_KEY = 'USER_ENV_UUID';
const MENU_RIGHTS_KEY = 'USER_MENU_RIGHTS';
const ROLES_KEY = 'USER_ROLES';
const PROFILE_KEY = 'USER_PROFILE';
const DESIGNATION_KEY = 'USER_DESIGNATION';
const DISPLAY_NAME_KEY = 'USER_DISPLAY_NAME';
const SELECTED_ENVIRONMENT_UUID_KEY = 'SELECTED_ENVIRONMENT_UUID';
const SELECTED_COMPANY_UUID_KEY = 'SELECTED_COMPANY_UUID';
const REPORTING_DESIGNATION_KEY = 'REPORTING_DESIGNATION_UUID';
const ROLE_UUID_KEY = 'ROLE_UUID';

export const getAccessToken = async () => {
	try {
		const token = await getStorage().getString(ACCESS_KEY);
		return token ?? null;
	} catch (_e) {
		return null;
	}
};

export const getRefreshToken = async () => {
	try {
		const token = await getStorage().getString(REFRESH_KEY);
		return token ?? null;
	} catch (_e) {
		return null;
	}
};

export const setTokens = async ({ accessToken, refreshToken }) => {
	if (accessToken) {
		await getStorage().set(ACCESS_KEY, accessToken);
	}
	if (refreshToken) {
		await getStorage().set(REFRESH_KEY, refreshToken);
	}
};

export const clearTokens = async () => {
	try { await getStorage().delete(ACCESS_KEY); } catch (_e) { }
	try { await getStorage().delete(REFRESH_KEY); } catch (_e) { }
	try { await getStorage().delete(UUID_KEY); } catch (_e) { }
	try { await getStorage().delete(CMP_UUID_KEY); } catch (_e) { }
	try { await getStorage().delete(ENV_UUID_KEY); } catch (_e) { }
	try { await getStorage().delete(MENU_RIGHTS_KEY); } catch (_e) { }
	try { await getStorage().delete(ROLES_KEY); } catch (_e) { }
	try { await getStorage().delete(PROFILE_KEY); } catch (_e) { }
	try { await getStorage().delete(DESIGNATION_KEY); } catch (_e) { }
	try { await getStorage().delete(DISPLAY_NAME_KEY); } catch (_e) { }
	try { await getStorage().delete(SELECTED_ENVIRONMENT_UUID_KEY); } catch (_e) { }
	try { await getStorage().delete(SELECTED_COMPANY_UUID_KEY); } catch (_e) { }
	try { await getStorage().delete(REPORTING_DESIGNATION_KEY); } catch (_e) { }
	try { await getStorage().delete(ROLE_UUID_KEY); } catch (_e) { }

};

// UUID storage functions
export const setUUID = async (uuid) => {
	try { await getStorage().set(UUID_KEY, uuid); } catch (_e) { }
};

export const getUUID = async () => {
	try { return await getStorage().getString(UUID_KEY) ?? null; } catch (_e) { return null; }
};
export const setCMPUUID = async (cmpUuid) => {
	try { await getStorage().set(CMP_UUID_KEY, cmpUuid); } catch (_e) { }
};
export const getCMPUUID = async () => {
	try { return await getStorage().getString(CMP_UUID_KEY) ?? null; } catch (_e) { return null; }
};
export const setENVUUID = async (envUuid) => {
	try { await getStorage().set(ENV_UUID_KEY, envUuid); } catch (_e) { }
};
export const getENVUUID = async () => {
	try { return await getStorage().getString(ENV_UUID_KEY) ?? null; } catch (_e) { return null; }
};
export const setMenuRights = async (menuRights) => {
    try { await getStorage().set(MENU_RIGHTS_KEY, JSON.stringify(menuRights)); } catch (_e) { }
};
export const getMenuRights = async () => {
    try {
        const rights = await getStorage().getString(MENU_RIGHTS_KEY);
        return rights ? JSON.parse(rights) : null;
    } catch (_e) {
        return null;
    }
};
export const setDesignation = async (designation) => {
	try { await getStorage().set(DESIGNATION_KEY, designation); } catch (_e) { }
};

export const getDesignation = async () => {
	try { return await getStorage().getString(DESIGNATION_KEY) ?? null; } catch (_e) { return null; }
};

// Reporting Designation UUID (from login payload)
export const setReportingDesignation = async (uuid) => {
    try { if (uuid) await getStorage().set(REPORTING_DESIGNATION_KEY, uuid); } catch (_e) { }
};

export const getReportingDesignation = async () => {
    try { return await getStorage().getString(REPORTING_DESIGNATION_KEY) ?? null; } catch (_e) { return null; }
};

// Roles storage functions
export const setRoles = async (roles) => {
	try { await getStorage().set(ROLES_KEY, JSON.stringify(roles)); } catch (_e) { }
};

export const getRoles = async () => {
	try {
		const roles = await getStorage().getString(ROLES_KEY);
		return roles ? JSON.parse(roles) : null;
	} catch (_e) {
		return null;
	}
};

// Profile storage functions
export const setProfile = async (profile) => {
	try { await getStorage().set(PROFILE_KEY, JSON.stringify(profile)); } catch (_e) { }
};

// (moved set/getMenuRights above to avoid re-declaration)

export const getProfile = async () => {
	try {
		const profile = await getStorage().getString(PROFILE_KEY);
		return profile ? JSON.parse(profile) : null;
	} catch (_e) {
		return null;
	}
};
 
// Display Name storage functions
export const setDisplayName = async (displayName) => {
	try { await getStorage().set(DISPLAY_NAME_KEY, displayName); } catch (_e) { }
};

export const getDisplayName = async () => {
	try { return await getStorage().getString(DISPLAY_NAME_KEY) ?? null; } catch (_e) { return null; }
};


// Allowed Company UUIDs storage functions
export const setAllowedCompanyUUIDs = async (uuids) => {
	try { await getStorage().set('ALLOWED_COMPANY_UUIDS', JSON.stringify(uuids)); } catch (_e) { }
};

export const getAllowedCompanyUUIDs = async () => {
	try {
		const uuids = await getStorage().getString('ALLOWED_COMPANY_UUIDS');
		return uuids ? JSON.parse(uuids) : null;
	} catch (_e) {
		return null;
	}
};

// Selected Environment UUID storage functions
export const setSelectedEnvironmentUUID = async (uuid) => {
	try { await getStorage().set(SELECTED_ENVIRONMENT_UUID_KEY, uuid); } catch (_e) { }
};

export const getSelectedEnvironmentUUID = async () => {
	try { return await getStorage().getString(SELECTED_ENVIRONMENT_UUID_KEY) ?? null; } catch (_e) { return null; }
};

// Selected Company UUID storage functions
export const setSelectedCompanyUUID = async (uuid) => {
	try { await getStorage().set(SELECTED_COMPANY_UUID_KEY, uuid); } catch (_e) { }
};

export const getSelectedCompanyUUID = async () => {
	try { return await getStorage().getString(SELECTED_COMPANY_UUID_KEY) ?? null; } catch (_e) { return null; }
};

// Role UUID storage functions
export const setRoleUUID = async (uuid) => {
	try { await getStorage().set(ROLE_UUID_KEY, uuid); } catch (_e) { }
};

export const getRoleUUID = async () => {
	try { return await getStorage().getString(ROLE_UUID_KEY) ?? null; } catch (_e) { return null; }
};
 
